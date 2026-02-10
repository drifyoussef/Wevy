import { Injectable } from '@angular/core';
import { SwipeSession, SwipeVote, SwipeResult } from '../models/swipe.model';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SwipeService {
  private currentSessionSubject = new BehaviorSubject<SwipeSession | null>(null);
  public currentSession$ = this.currentSessionSubject.asObservable();

  constructor() {
    // Supabase disabled for local development
  }

  async getTodaySession(): Promise<SwipeSession | null> {
    // Local mode - no Supabase
    return null;
  }

  async createSession(householdId: string, recipeIds: string[]): Promise<SwipeSession> {
    // Local mode - return mock session
    const mockSession = {
      id: 'local-session',
      householdId,
      date: new Date(),
      status: 'active' as const,
      recipes: recipeIds,
      swipes: [],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
    return mockSession;
  }

  async recordSwipe(): Promise<SwipeResult> {
    // Local mode - return mock result
    return {
      matched: false,
      allMembersVoted: false
    };
  }

  private async checkForMatch(): Promise<SwipeResult> {
    // Local mode - simplified check
    return {
      matched: false,
      allMembersVoted: false
    };
  }

  async getUserSwipes(): Promise<SwipeVote[]> {
    // Local mode - return empty array
    return [];
  }

  async getSessionHistory(): Promise<SwipeSession[]> {
    // Local mode - return empty array
    return [];
  }
}
