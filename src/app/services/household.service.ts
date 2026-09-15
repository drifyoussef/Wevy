import { Injectable } from '@angular/core';
import { Household, HouseholdMember } from '../models/user.model';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

// Représentation d'un foyer telle que renvoyée par le backend
interface BackendHouseholdMember {
  userId: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  role: 'admin' | 'member';
  joinedAt: string | Date;
}

interface BackendHousehold {
  _id?: string;
  id?: string;
  name: string;
  createdBy: string;
  inviteCode: string;
  members: BackendHouseholdMember[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

@Injectable({
  providedIn: 'root'
})
export class HouseholdService {
  private currentHouseholdSubject = new BehaviorSubject<Household | null>(null);
  public currentHousehold$ = this.currentHouseholdSubject.asObservable();

  constructor(private api: ApiService, private authService: AuthService) {
    // Le foyer courant suit l'utilisateur connecté (aucune donnée locale partagée)
    this.authService.currentUser$.subscribe(user => {
      if (user?.householdId) {
        this.loadHouseholdById(user.householdId);
      } else {
        this.currentHouseholdSubject.next(null);
      }
    });
  }

  /**
   * Charge un foyer depuis le backend et le définit comme foyer courant
   */
  private async loadHouseholdById(householdId: string): Promise<void> {
    try {
      const response = await this.api.getAsync<{ household: BackendHousehold }>(`households/${householdId}`);
      this.currentHouseholdSubject.next(this.normalize(response.household));
    } catch (error) {
      console.error('Error loading household:', error);
      // Foyer introuvable / plus membre : on nettoie l'état
      this.currentHouseholdSubject.next(null);
    }
  }

  /**
   * Créer un nouveau foyer
   */
  async createHousehold(name: string, _userId?: string, _displayName?: string): Promise<Household> {
    const response = await this.api.postAsync<{ household: BackendHousehold }>('households', { name });
    const household = this.normalize(response.household);
    this.authService.setHouseholdId(household.id);
    this.currentHouseholdSubject.next(household);
    return household;
  }

  /**
   * Rejoindre un foyer via code ami
   */
  async joinHouseholdByCode(inviteCode: string, _userId?: string, _displayName?: string): Promise<Household | null> {
    const response = await this.api.postAsync<{ household: BackendHousehold }>('households/join', {
      inviteCode: inviteCode.trim().toUpperCase()
    });
    const household = this.normalize(response.household);
    this.authService.setHouseholdId(household.id);
    this.currentHouseholdSubject.next(household);
    return household;
  }

  /**
   * Rejoindre un foyer via lien d'invitation (wevy://join/CODE)
   */
  async joinHouseholdByLink(inviteLink: string, userId?: string, displayName?: string): Promise<Household | null> {
    const code = this.extractCodeFromLink(inviteLink);
    if (!code) {
      throw new Error('Lien d\'invitation invalide');
    }
    return this.joinHouseholdByCode(code, userId, displayName);
  }

  /**
   * Obtenir le foyer actuel
   */
  async getCurrentHousehold(): Promise<Household | null> {
    return this.currentHouseholdSubject.value;
  }

  /**
   * Obtenir le foyer actuel sous forme d'observable
   */
  getCurrentHousehold$(): Observable<Household | null> {
    return this.currentHousehold$;
  }

  /**
   * Obtenir tous les foyers de l'utilisateur
   */
  async getHouseholds(): Promise<Household[]> {
    const response = await this.api.getAsync<{ households: BackendHousehold[] }>('households');
    return (response.households || []).map(h => this.normalize(h));
  }

  /**
   * Régénérer le code / lien d'invitation
   */
  async regenerateInviteLink(householdId: string): Promise<{ link: string; code: string }> {
    const response = await this.api.postAsync<{ household: BackendHousehold }>(
      `households/${householdId}/regenerate-invite`,
      {}
    );
    const household = this.normalize(response.household);
    if (this.currentHouseholdSubject.value?.id === householdId) {
      this.currentHouseholdSubject.next(household);
    }
    return { link: household.inviteLink, code: household.inviteCode };
  }

  /**
   * Retirer un membre du foyer
   */
  async removeMember(householdId: string, userId: string): Promise<void> {
    const response = await this.api.deleteAsync<{ household: BackendHousehold }>(
      `households/${householdId}/members/${userId}`
    );
    if (this.currentHouseholdSubject.value?.id === householdId) {
      this.currentHouseholdSubject.next(this.normalize(response.household));
    }
  }

  /**
   * Mettre à jour le rôle d'un membre
   */
  async updateMemberRole(householdId: string, userId: string, role: 'admin' | 'member'): Promise<void> {
    const response = await this.api.putAsync<{ household: BackendHousehold }>(
      `households/${householdId}/members/${userId}`,
      { role }
    );
    if (this.currentHouseholdSubject.value?.id === householdId) {
      this.currentHouseholdSubject.next(this.normalize(response.household));
    }
  }

  /**
   * Quitter un foyer
   */
  async leaveHousehold(householdId: string, _userId?: string): Promise<void> {
    await this.api.deleteAsync(`households/${householdId}/leave`);
    if (this.authService.getHouseholdId() === householdId) {
      this.authService.setHouseholdId(null);
    }
    this.currentHouseholdSubject.next(null);
  }

  /**
   * Définir le foyer actuel (et le household actif de l'utilisateur)
   */
  setCurrentHousehold(household: Household): void {
    this.authService.setHouseholdId(household.id);
    this.currentHouseholdSubject.next(household);
  }

  /**
   * Normalise un foyer backend vers le modèle frontend
   */
  private normalize(h: BackendHousehold): Household {
    const inviteCode = h.inviteCode || '';
    return {
      id: (h._id || h.id) as string,
      name: h.name,
      createdBy: h.createdBy,
      createdAt: new Date(h.createdAt),
      updatedAt: new Date(h.updatedAt),
      inviteCode,
      inviteLink: this.buildInviteLink(inviteCode),
      members: (Array.isArray(h.members) ? h.members : []).map(m => this.normalizeMember(m))
    };
  }

  private normalizeMember(m: BackendHouseholdMember): HouseholdMember {
    return {
      userId: m.userId,
      displayName: m.displayName || m.email || 'Membre',
      avatarUrl: m.avatarUrl,
      role: m.role || 'member',
      joinedAt: new Date(m.joinedAt)
    };
  }

  private buildInviteLink(code: string): string {
    return code ? `wevy://join/${code}` : '';
  }

  private extractCodeFromLink(link: string): string | null {
    if (!link) return null;
    const trimmed = link.trim();
    // Accepte "wevy://join/CODE", ".../join/CODE" ou un code brut
    const match = trimmed.match(/join\/([A-Za-z0-9]+)/);
    if (match) return match[1].toUpperCase();
    if (/^[A-Za-z0-9]+$/.test(trimmed)) return trimmed.toUpperCase();
    return null;
  }
}
