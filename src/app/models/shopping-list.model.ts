import { Ingredient } from './recipe.model';

export interface ShoppingList {
  id: string;
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
  ingredient: Ingredient;
  recipeId?: string;
  recipeName?: string;
  isChecked: boolean;
  addedManually?: boolean;
  createdAt: Date;
}

export interface ShoppingListGroup {
  category: string;
  items: ShoppingListItem[];
}
