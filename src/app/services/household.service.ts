import { Injectable } from '@angular/core';
import { Household, HouseholdMember } from '../models/user.model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HouseholdService {
  private readonly STORAGE_KEY = 'wevy_households';
  private currentHouseholdSubject = new BehaviorSubject<Household | null>(null);
  public currentHousehold$ = this.currentHouseholdSubject.asObservable();

  constructor() {
    this.loadCurrentHousehold();
  }

  /**
   * Créer un nouveau foyer
   */
  async createHousehold(name: string, userId: string, displayName: string): Promise<Household> {
    const inviteCode = this.generateInviteCode();
    const inviteLink = this.generateInviteLink(inviteCode);

    const household: Household = {
      id: `household-${Date.now()}`,
      name,
      createdBy: userId,
      inviteCode,
      inviteLink,
      members: [
        {
          userId,
          displayName,
          role: 'admin',
          joinedAt: new Date()
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.saveHousehold(household);
    this.currentHouseholdSubject.next(household);
    return household;
  }

  /**
   * Rejoindre un foyer via code ami
   */
  async joinHouseholdByCode(inviteCode: string, userId: string, displayName: string): Promise<Household | null> {
    const households = this.loadHouseholdsFromStorage();
    const household = households.find(h => h.inviteCode === inviteCode);

    if (!household) {
      throw new Error('Code ami invalide');
    }

    // Vérifier que l'utilisateur n'est pas déjà membre
    if (household.members.some(m => m.userId === userId)) {
      throw new Error('Vous êtes déjà membre de ce foyer');
    }

    // Ajouter l'utilisateur comme membre
    household.members.push({
      userId,
      displayName,
      role: 'member',
      joinedAt: new Date()
    });

    household.updatedAt = new Date();
    this.saveHousehold(household);
    this.currentHouseholdSubject.next(household);
    return household;
  }

  /**
   * Rejoindre un foyer via lien d'invitation unique
   */
  async joinHouseholdByLink(inviteLink: string, userId: string, displayName: string): Promise<Household | null> {
    const households = this.loadHouseholdsFromStorage();
    const household = households.find(h => h.inviteLink === inviteLink);

    if (!household) {
      throw new Error('Lien d\'invitation invalide ou expiré');
    }

    // Vérifier l'expiration si définie
    if (household.inviteLinkExpiry && new Date() > new Date(household.inviteLinkExpiry)) {
      throw new Error('Lien d\'invitation expiré');
    }

    // Vérifier que l'utilisateur n'est pas déjà membre
    if (household.members.some(m => m.userId === userId)) {
      throw new Error('Vous êtes déjà membre de ce foyer');
    }

    // Ajouter l'utilisateur comme membre
    household.members.push({
      userId,
      displayName,
      role: 'member',
      joinedAt: new Date()
    });

    household.updatedAt = new Date();
    this.saveHousehold(household);
    this.currentHouseholdSubject.next(household);
    return household;
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
   * Obtenir tous les foyers
   */
  async getHouseholds(): Promise<Household[]> {
    return this.loadHouseholdsFromStorage();
  }

  /**
   * Inviter un nouveau lien
   */
  async regenerateInviteLink(householdId: string): Promise<{ link: string; code: string }> {
    const households = this.loadHouseholdsFromStorage();
    const household = households.find(h => h.id === householdId);

    if (!household) {
      throw new Error('Foyer non trouvé');
    }

    const newCode = this.generateInviteCode();
    const newLink = this.generateInviteLink(newCode);

    household.inviteCode = newCode;
    household.inviteLink = newLink;
    household.inviteLinkExpiry = this.generateExpiryDate();
    household.updatedAt = new Date();

    this.saveHousehold(household);
    if (this.currentHouseholdSubject.value?.id === householdId) {
      this.currentHouseholdSubject.next(household);
    }

    return { link: newLink, code: newCode };
  }

  /**
   * Retirer un membre du foyer
   */
  async removeMember(householdId: string, userId: string): Promise<void> {
    const households = this.loadHouseholdsFromStorage();
    const household = households.find(h => h.id === householdId);

    if (!household) {
      throw new Error('Foyer non trouvé');
    }

    household.members = household.members.filter(m => m.userId !== userId);
    household.updatedAt = new Date();

    this.saveHousehold(household);
    if (this.currentHouseholdSubject.value?.id === householdId) {
      this.currentHouseholdSubject.next(household);
    }
  }

  /**
   * Mettre à jour le rôle d'un membre
   */
  async updateMemberRole(householdId: string, userId: string, role: 'admin' | 'member'): Promise<void> {
    const households = this.loadHouseholdsFromStorage();
    const household = households.find(h => h.id === householdId);

    if (!household) {
      throw new Error('Foyer non trouvé');
    }

    const member = household.members.find(m => m.userId === userId);
    if (member) {
      member.role = role;
      household.updatedAt = new Date();
      this.saveHousehold(household);

      if (this.currentHouseholdSubject.value?.id === householdId) {
        this.currentHouseholdSubject.next(household);
      }
    }
  }

  /**
   * Quitter un foyer
   */
  async leaveHousehold(householdId: string, userId: string): Promise<void> {
    await this.removeMember(householdId, userId);
    this.currentHouseholdSubject.next(null);
  }

  /**
   * Charger le foyer actuel depuis le localStorage
   */
  private loadCurrentHousehold(): void {
    try {
      const storedHouseholdId = localStorage.getItem('wevy_current_household_id');
      if (storedHouseholdId) {
        const households = this.loadHouseholdsFromStorage();
        const household = households.find(h => h.id === storedHouseholdId);
        if (household) {
          this.currentHouseholdSubject.next(household);
        }
      }
    } catch (error) {
      console.error('Error loading current household:', error);
    }
  }

  /**
   * Sauvegarder les données du foyer
   */
  private saveHousehold(household: Household): void {
    try {
      const households = this.loadHouseholdsFromStorage();
      const index = households.findIndex(h => h.id === household.id);

      if (index >= 0) {
        households[index] = household;
      } else {
        households.push(household);
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(households));
    } catch (error) {
      console.error('Error saving household:', error);
    }
  }

  /**
   * Charger tous les foyers
   */
  private loadHouseholdsFromStorage(): Household[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading households from storage:', error);
    }
    return [];
  }

  /**
   * Générer un code ami unique
   */
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Générer un lien d'invitation unique (style YouTube)
   */
  private generateInviteLink(code: string): string {
    // Format: wevy://join/CODE ou https://wevy.app/join/CODE
    return `wevy://join/${code}`;
  }

  /**
   * Générer une date d'expiration (30 jours par défaut)
   */
  private generateExpiryDate(days: number = 30): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  /**
   * Définir le foyer actuel
   */
  setCurrentHousehold(household: Household): void {
    this.currentHouseholdSubject.next(household);
    localStorage.setItem('wevy_current_household_id', household.id);
  }
}
