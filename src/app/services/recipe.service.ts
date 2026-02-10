import { Injectable } from '@angular/core';
import { Recipe, RecipeFilter } from '../models/recipe.model';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private recipesSubject = new BehaviorSubject<Recipe[]>([]);
  public recipes$ = this.recipesSubject.asObservable();

  constructor() {
    // Supabase disabled for local development
  }

  async getRecipes(_householdId?: string, _filter?: RecipeFilter): Promise<Recipe[]> {
    // Mock data for development
    console.log(_householdId, _filter);
    const mockRecipes: Recipe[] = [
      {
        id: '1',
        title: 'Pâtes Carbonara',
        description: 'Recette italienne classique',
        imageUrl: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400',
        sourcePlatform: 'manual',
        totalTime: 30,
        difficulty: 'easy',
        servings: 4,
        ingredients: [],
        instructions: [],
        householdId: 'household1',
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        title: 'Pizza Margherita',
        description: 'Pizza italienne traditionnelle',
        imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400',
        sourcePlatform: 'manual',
        totalTime: 45,
        difficulty: 'medium',
        servings: 2,
        ingredients: [],
        instructions: [],
        householdId: 'household1',
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '3',
        title: 'Salade Buddha Bowl',
        description: 'Bowl végétarien coloré',
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
        sourcePlatform: 'manual',
        totalTime: 20,
        difficulty: 'easy',
        servings: 2,
        ingredients: [],
        instructions: [],
        householdId: 'household1',
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '4',
        title: 'Burger Maison',
        description: 'Burger fait maison',
        imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
        sourcePlatform: 'manual',
        totalTime: 30,
        difficulty: 'medium',
        servings: 4,
        ingredients: [],
        instructions: [],
        householdId: 'household1',
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '5',
        title: 'Tacos',
        description: 'Tacos mexicains',
        imageUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400',
        sourcePlatform: 'manual',
        totalTime: 25,
        difficulty: 'easy',
        servings: 4,
        ingredients: [],
        instructions: [],
        householdId: 'household1',
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    return mockRecipes;

    /* Production code with Supabase:
    let query = this.supabase
      .from('recipes')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false });

    if (filter?.maxTime) {
      query = query.lte('total_time', filter.maxTime);
    }

    if (filter?.difficulty && filter.difficulty.length > 0) {
      query = query.in('difficulty', filter.difficulty);
    }

    if (filter?.mealType && filter.mealType.length > 0) {
      query = query.in('meal_type', filter.mealType);
    }

    if (filter?.searchTerm) {
      query = query.ilike('title', `%${filter.searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    
    this.recipesSubject.next(data || []);
    return data || [];
    */
  }

  async getRecipeById(id: string): Promise<Recipe | null> {
    // Local mode - return null or mock data
    const mockRecipes = await this.getRecipes();
    return mockRecipes.find(r => r.id === id) || null;
  }

  async createRecipe(recipe: Partial<Recipe>): Promise<Recipe> {
    // Local mode - return mock data
    const newRecipe = {
      ...recipe,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    } as Recipe;
    
    const currentRecipes = this.recipesSubject.value;
    this.recipesSubject.next([newRecipe, ...currentRecipes]);
    
    return newRecipe;
  }

  async updateRecipe(id: string, updates: Partial<Recipe>): Promise<Recipe> {
    // Local mode - return mock data
    const currentRecipes = this.recipesSubject.value;
    const recipe = currentRecipes.find(r => r.id === id);
    const updatedRecipe = { ...recipe, ...updates, updatedAt: new Date() } as Recipe;
    const updatedRecipes = currentRecipes.map(r => r.id === id ? updatedRecipe : r);
    this.recipesSubject.next(updatedRecipes);
    return updatedRecipe;
  }

  async deleteRecipe(id: string): Promise<void> {
    // Local mode - remove from local state
    const currentRecipes = this.recipesSubject.value;
    this.recipesSubject.next(currentRecipes.filter(r => r.id !== id));
  }

  async toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
    await this.updateRecipe(id, { isFavorite });
  }

  async incrementTimesCooked(id: string): Promise<void> {
    const recipe = await this.getRecipeById(id);
    if (recipe) {
      await this.updateRecipe(id, {
        timesCooked: (recipe.timesCooked || 0) + 1,
        lastCookedAt: new Date()
      });
    }
  }

  async extractRecipeFromUrl(url: string): Promise<Partial<Recipe>> {
    // This would call a cloud function or API to scrape recipe data
    // For now, returning a placeholder
    const sourcePlatform = this.detectSourcePlatform(url);
    
    return {
      sourceUrl: url,
      sourcePlatform,
      title: 'Recipe from ' + sourcePlatform,
      description: 'Imported recipe',
      ingredients: []
    };
  }

  private detectSourcePlatform(url: string): 'tiktok' | 'instagram' | 'url' | 'manual' {
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    return 'url';
  }
}
