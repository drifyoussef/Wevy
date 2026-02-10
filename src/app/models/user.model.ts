export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  householdId?: string;
  role?: 'admin' | 'member';
  createdAt: Date;
  updatedAt: Date;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  dietaryRestrictions?: string[];
  dislikedIngredients?: string[];
  favoriteCategories?: string[];
  notificationsEnabled?: boolean;
  swipeReminders?: boolean;
}

export interface Household {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  members: HouseholdMember[];
  inviteCode?: string;
}

export interface HouseholdMember {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  role: 'admin' | 'member';
  joinedAt: Date;
}
