import { Injectable } from '@angular/core';
import { Household } from '../models/user.model';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HouseholdService {
  private currentHouseholdSubject = new BehaviorSubject<Household | null>(null);
  public currentHousehold$ = this.currentHouseholdSubject.asObservable();

  constructor() {
    // Supabase disabled for local development
  }

  async createHousehold(name: string, userId: string): Promise<Household> {
    const mockHousehold = {
      id: 'mock-household-1',
      name,
      createdBy: userId,
      inviteCode: this.generateInviteCode(),
      members: [],
      createdAt: new Date(),
      updatedAt: new Date()
    } as Household;
    return mockHousehold;
  }

  async getHousehold(): Promise<Household | null> {
    return null;
  }

  async getUserHousehold(): Promise<Household | null> {
    return null;
  }

  async joinHousehold(): Promise<Household> {
    const mockHousehold = {
      id: 'mock-household-1',
      name: 'Mock Household',
      members: [],
      createdBy: 'user1',
      inviteCode: '12345678',
      createdAt: new Date(),
      updatedAt: new Date()
    } as Household;
    return mockHousehold;
  }

  async removeMember(): Promise<void> {
    // Local mode - no action
  }

  async updateMemberRole(): Promise<void> {
    // Local mode - no action
  }

  async regenerateInviteCode(): Promise<string> {
    return this.generateInviteCode();
  }

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
