import { Injectable } from '@angular/core';
import { ShoppingList, ShoppingListItem, ShoppingListGroup } from '../models/shopping-list.model';
import { Recipe, Ingredient } from '../models/recipe.model';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ShoppingListService {
  private currentListSubject = new BehaviorSubject<ShoppingList | null>(null);
  public currentList$ = this.currentListSubject.asObservable();

  constructor() {
    // Supabase disabled for local development
  }

  async getCurrentList(_householdId?: string): Promise<ShoppingList | null> {

    console.log(_householdId);
    // Mock data for development
    const mockList: ShoppingList = {
      id: '1',
      householdId: 'household1',
      recipeIds: ['1'],
      items: [
        {
          id: '1',
          ingredient: {
            name: 'Lait',
            quantity: 2,
            unit: 'L',
            category: 'dairy'
          },
          isChecked: false,
          addedManually: false,
          createdAt: new Date()
        },
        {
          id: '2',
          ingredient: {
            name: 'Pain',
            quantity: 1,
            unit: '',
            category: 'pantry'
          },
          isChecked: false,
          addedManually: false,
          createdAt: new Date()
        },
        {
          id: '3',
          ingredient: {
            name: 'Tomates',
            quantity: 1,
            unit: 'kg',
            category: 'produce'
          },
          isChecked: false,
          addedManually: false,
          createdAt: new Date()
        }
      ],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.currentListSubject.next(mockList);
    return mockList;

    /* Production code with Supabase:
    const { data, error } = await this.supabase
      .from('shopping_lists')
      .select('*')
      .eq('household_id', householdId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    this.currentListSubject.next(data);
    return data;
    */
  }

  async createListFromRecipe(householdId: string, recipe: Recipe): Promise<ShoppingList> {
    const items: ShoppingListItem[] = recipe.ingredients.map((ingredient, index) => ({
      id: `${Date.now()}-${index}`,
      ingredient,
      recipeId: recipe.id,
      recipeName: recipe.title,
      isChecked: false,
      addedManually: false,
      createdAt: new Date()
    }));

    const list: ShoppingList = {
      id: '1',
      householdId,
      items,
      recipeIds: [recipe.id],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.currentListSubject.next(list);
    return list;
  }

  async addRecipeToList(listId: string, recipe: Recipe): Promise<ShoppingList> {
    const currentList = this.currentListSubject.value;
    if (!currentList) {
      return this.createListFromRecipe('household1', recipe);
    }

    const newItems: ShoppingListItem[] = recipe.ingredients.map((ingredient, index) => ({
      id: `${Date.now()}-${index}`,
      ingredient,
      recipeId: recipe.id,
      recipeName: recipe.title,
      isChecked: false,
      addedManually: false,
      createdAt: new Date()
    }));

    const updatedItems = [...currentList.items, ...newItems];
    const updatedRecipeIds = [...new Set([...currentList.recipeIds, recipe.id])];

    const updatedList = {
      ...currentList,
      items: updatedItems,
      recipeIds: updatedRecipeIds,
      updatedAt: new Date()
    };
    
    this.currentListSubject.next(updatedList);
    return updatedList;
  }

  async addManualItem(listId: string, ingredient: Ingredient): Promise<ShoppingList> {
    const currentList = this.currentListSubject.value;
    if (!currentList) {
      throw new Error('No shopping list found');
    }

    const newItem: ShoppingListItem = {
      id: `${Date.now()}`,
      ingredient,
      isChecked: false,
      addedManually: true,
      createdAt: new Date()
    };

    const updatedItems = [...currentList.items, newItem];

    const updatedList = {
      ...currentList,
      items: updatedItems,
      updatedAt: new Date()
    };
    
    this.currentListSubject.next(updatedList);
    return updatedList;
  }

  async toggleItemChecked(listId: string, itemId: string): Promise<void> {
    // Mock implementation for development
    const currentList = this.currentListSubject.value;
    if (currentList) {
      const updatedItems = currentList.items.map((item: ShoppingListItem) =>
        item.id === itemId ? { ...item, isChecked: !item.isChecked } : item
      );
      this.currentListSubject.next({ ...currentList, items: updatedItems });
    }
    
    /* Production code with Supabase:
    const { data: currentList, error: fetchError } = await this.supabase
      .from('shopping_lists')
      .select('*')
      .eq('id', listId)
      .single();

    if (fetchError) throw fetchError;

    const updatedItems = currentList.items.map((item: ShoppingListItem) =>
      item.id === itemId ? { ...item, isChecked: !item.isChecked } : item
    );

    const { data, error } = await this.supabase
      .from('shopping_lists')
      .update({ items: updatedItems })
      .eq('id', listId)
      .select()
      .single();

    if (error) throw error;
    
    this.currentListSubject.next(data);
    */
  }
  
  async toggleItem(itemId: string): Promise<void> {
    await this.toggleItemChecked('1', itemId);
  }

  async removeItem(listId: string, itemId: string): Promise<void> {
    const currentList = this.currentListSubject.value;
    if (!currentList) return;

    const updatedItems = currentList.items.filter((item: ShoppingListItem) => item.id !== itemId);

    const updatedList = {
      ...currentList,
      items: updatedItems,
      updatedAt: new Date()
    };
    
    this.currentListSubject.next(updatedList);
  }

  async completeList(): Promise<void> {
    // Local mode - clear the list
    this.currentListSubject.next(null);
  }

  groupItemsByCategory(items: ShoppingListItem[]): ShoppingListGroup[] {
    const groups: { [key: string]: ShoppingListItem[] } = {};

    items.forEach(item => {
      const category = item.ingredient.category || 'other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });

    return Object.entries(groups).map(([category, items]) => ({
      category,
      items
    }));
  }
}
