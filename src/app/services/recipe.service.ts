import { Injectable } from '@angular/core';
import { Recipe, RecipeFilter } from '../models/recipe.model';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { HouseholdService } from './household.service';

/** What the AI import tells about how it read the link. */
export interface RecipeImportMeta {
  platform: string;
  usedVideo: boolean;
  model: string;
}

/** Watching a video takes the AI up to ~1 min: the default 15 s timeout would cut it off. */
const IMPORT_TIMEOUT_MS = 150000;

@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private recipesSubject = new BehaviorSubject<Recipe[]>([]);
  public recipes$ = this.recipesSubject.asObservable();

  constructor(
    private apiService: ApiService,
    private householdService: HouseholdService
  ) {}

  /** Recipes of the current household (the householdId argument is kept for older callers). */
  async getRecipes(householdId?: string, filter?: RecipeFilter): Promise<Recipe[]> {
    const id = householdId && householdId !== 'placeholder-household-id'
      ? householdId
      : (await this.householdService.getCurrentHousehold())?.id;
    if (!id) {
      this.recipesSubject.next([]);
      return [];
    }

    const params: Record<string, string> = {};
    if (filter?.searchTerm) params['search'] = filter.searchTerm;

    const response = await this.apiService.getAsync<{ recipes: Recipe[] }>(`recipes/household/${id}`, params);
    const recipes = (response.recipes || []).map(recipe => this.normalize(recipe));
    this.recipesSubject.next(recipes);
    return recipes;
  }

  async getRecipeById(id: string): Promise<Recipe | null> {
    try {
      const response = await this.apiService.getAsync<{ recipe: Recipe }>(`recipes/${id}`);
      return response.recipe ? this.normalize(response.recipe) : null;
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode === 404) return null;
      throw error;
    }
  }

  async createRecipe(recipe: Partial<Recipe>): Promise<Recipe> {
    // The server files it under the user's household and sets the author itself
    const response = await this.apiService.postAsync<{ recipe: Recipe }>('recipes', recipe);
    const created = this.normalize(response.recipe);
    this.recipesSubject.next([created, ...this.recipesSubject.value]);
    return created;
  }

  async updateRecipe(id: string, updates: Partial<Recipe>): Promise<Recipe> {
    const response = await this.apiService.putAsync<{ recipe: Recipe }>(`recipes/${id}`, updates);
    return this.replaceLocal(this.normalize(response.recipe));
  }

  async deleteRecipe(id: string): Promise<void> {
    await this.apiService.deleteAsync(`recipes/${id}`);
    this.recipesSubject.next(this.recipesSubject.value.filter(r => r.id !== id));
  }

  /** Flips the favorite flag on the server and returns the updated recipe. */
  async toggleFavorite(id: string): Promise<Recipe> {
    const response = await this.apiService.postAsync<{ recipe: Recipe }>(`recipes/${id}/favorite`, {});
    return this.replaceLocal(this.normalize(response.recipe));
  }

  async incrementTimesCooked(id: string): Promise<Recipe> {
    const response = await this.apiService.postAsync<{ recipe: Recipe }>(`recipes/${id}/cooked`, {});
    return this.replaceLocal(this.normalize(response.recipe));
  }

  /**
   * Reads any link (TikTok, Instagram, Facebook, YouTube, recipe website...) and has the AI
   * turn it into a recipe to review. Nothing is saved until createRecipe().
   */
  async extractRecipeFromUrl(url: string): Promise<{ recipe: Partial<Recipe>; meta: RecipeImportMeta }> {
    return this.apiService.postAsync<{ recipe: Partial<Recipe>; meta: RecipeImportMeta }>(
      'recipes/extract',
      { url },
      IMPORT_TIMEOUT_MS
    );
  }

  private replaceLocal(recipe: Recipe): Recipe {
    this.recipesSubject.next(this.recipesSubject.value.map(r => r.id === recipe.id ? recipe : r));
    return recipe;
  }

  /** JSON dates come back as strings. */
  private normalize(recipe: Recipe): Recipe {
    return {
      ...recipe,
      ingredients: recipe.ingredients || [],
      createdAt: new Date(recipe.createdAt),
      updatedAt: new Date(recipe.updatedAt),
      lastCookedAt: recipe.lastCookedAt ? new Date(recipe.lastCookedAt) : undefined
    };
  }
}
