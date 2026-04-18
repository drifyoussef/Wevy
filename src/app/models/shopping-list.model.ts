import { Ingredient } from './recipe.model';

export interface ShoppingList {
  id?: string;
  _id?: string; // MongoDB ID
  householdId: string;
  items: ShoppingListItem[];
  recipeIds: string[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  status: 'active' | 'completed';
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string; // 'g', 'kg', 'L', 'ml', 'pcs', etc.
  category?: 'produce' | 'meat' | 'dairy' | 'pantry' | 'spices' | 'other';
  
  // Legacy fields for backward compatibility
  ingredient?: Ingredient;
  
  // Recipe-related
  recipeId?: string;
  recipeName?: string;
  
  // State
  isChecked: boolean;
  addedManually?: boolean;
  createdAt: Date;
}

export interface ShoppingListGroup {
  category: string;
  items: ShoppingListItem[];
}
