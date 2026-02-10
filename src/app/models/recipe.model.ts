export interface Recipe {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  sourceUrl?: string;
  sourcePlatform?: 'tiktok' | 'instagram' | 'url' | 'manual';
  ingredients: Ingredient[];
  instructions?: string[];
  prepTime?: number; // minutes
  cookTime?: number; // minutes
  totalTime?: number; // minutes
  difficulty?: 'easy' | 'medium' | 'hard';
  servings?: number;
  toolsNeeded?: string[];
  tags?: string[];
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';
  householdId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isFavorite?: boolean;
  timesCooked?: number;
  lastCookedAt?: Date;
}

export interface Ingredient {
  id?: string;
  name: string;
  quantity?: number;
  unit?: string;
  category?: 'produce' | 'meat' | 'dairy' | 'pantry' | 'spices' | 'other';
  optional?: boolean;
}

export interface RecipeFilter {
  maxTime?: number;
  difficulty?: ('easy' | 'medium' | 'hard')[];
  toolsNeeded?: string[];
  mealType?: string[];
  tags?: string[];
  searchTerm?: string;
}
