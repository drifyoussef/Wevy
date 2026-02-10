import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';

interface User {
  _id: string;
  email: string;
  displayName: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthResponse {
  user: User;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private tokenKey = 'wevy_auth_token';
  private initPromise: Promise<void>;

  constructor(private apiService: ApiService) {
    // Initialize auth state from storage
    this.initPromise = this.loadStoredAuth();
  }

  async waitForInit(): Promise<void> {
    return this.initPromise;
  }

  async getDisplayName(): Promise<string> {
    await this.waitForInit();
    const user = this.currentUserSubject.value;
    return user ? user.displayName : '';
  }

  private async loadStoredAuth(): Promise<void> {
    const token = localStorage.getItem(this.tokenKey);
    if (token) {
      this.apiService.setAuthToken(token);
      // Load user profile
      await this.loadUserProfile();
    }
  }

  private async loadUserProfile() {
    try {
      const response = await this.apiService.getAsync<{ user: User }>('auth/me');
      this.currentUserSubject.next(response.user);
    } catch (error) {
      console.error('Error loading user profile:', error);
      this.signOut();
    }
  }

  async signUp(email: string, password: string, displayName: string): Promise<User> {
    try {
      const response = await this.apiService.postAsync<AuthResponse>('auth/register', {
        email,
        password,
        displayName
      });
      
      // Store token
      localStorage.setItem(this.tokenKey, response.token);
      this.apiService.setAuthToken(response.token);
      
      // Update current user
      this.currentUserSubject.next(response.user);
      
      return response.user;
    } catch (error: unknown) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  async signIn(email: string, password: string): Promise<User> {
    try {
      const response = await this.apiService.postAsync<AuthResponse>('auth/login', {
        email,
        password
      });
      
      // Store token
      localStorage.setItem(this.tokenKey, response.token);
      this.apiService.setAuthToken(response.token);
      
      // Update current user
      this.currentUserSubject.next(response.user);
      
      return response.user;
    } catch (error: unknown) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    localStorage.removeItem(this.tokenKey);
    this.apiService.setAuthToken(null);
    this.currentUserSubject.next(null);
  }

  async updateProfile(displayName?: string, avatar?: string): Promise<User> {
    const response = await this.apiService.putAsync<{ user: User }>('auth/profile', {
      displayName,
      avatar
    });
    
    this.currentUserSubject.next(response.user);
    return response.user;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }
}
