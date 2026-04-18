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
    console.log('getRecipes called with householdId:', _householdId, 'filter:', _filter);
    const mockRecipes: Recipe[] = [
      {
        id: '1',
        title: 'Pâtes Carbonara',
        description: 'Recette italienne classique avec œufs, bacon et fromage',
        imageUrl: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400',
        sourcePlatform: 'manual',
        prepTime: 5,
        cookTime: 20,
        totalTime: 25,
        difficulty: 'easy',
        servings: 4,
        mealType: 'dinner',
        tags: ['italien', 'rapide', 'classique'],
        toolsNeeded: ['Casserole', 'Poêle', 'Fouet'],
        ingredients: [
          { name: 'Pâtes', quantity: 400, unit: 'g', category: 'pantry' },
          { name: 'Œufs', quantity: 4, unit: 'pcs', category: 'dairy' },
          { name: 'Bacon', quantity: 200, unit: 'g', category: 'meat' },
          { name: 'Parmesan râpé', quantity: 100, unit: 'g', category: 'dairy' },
          { name: 'Sel', quantity: 1, unit: 'pincée', category: 'spices' },
          { name: 'Poivre', quantity: 1, unit: 'pincée', category: 'spices' }
        ],
        instructions: [
          'Faites bouillir de l\'eau salée et cuisez les pâtes al dente',
          'Pendant ce temps, coupez le bacon en petits morceaux et faites-le revenir',
          'Fouettez les œufs avec le parmesan et le poivre',
          'Égouttez les pâtes en gardant un peu d\'eau de cuisson',
          'Mélangez les pâtes chaudes avec le bacon',
          'Versez le mélange d\'œufs et mélangez rapidement avec l\'eau de cuisson'
        ],
        householdId: 'household1',
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        title: 'Pizza Margherita',
        description: 'Pizza italienne traditionnelle avec tomate, mozzarella et basilic',
        imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400',
        sourcePlatform: 'manual',
        prepTime: 15,
        cookTime: 25,
        totalTime: 40,
        difficulty: 'medium',
        servings: 2,
        mealType: 'dinner',
        tags: ['italien', 'végétarien', 'classique'],
        toolsNeeded: ['Four', 'Plaque de cuisson'],
        ingredients: [
          { name: 'Pâte à pizza', quantity: 200, unit: 'g', category: 'pantry' },
          { name: 'Sauce tomate', quantity: 100, unit: 'ml', category: 'pantry' },
          { name: 'Mozzarella', quantity: 150, unit: 'g', category: 'dairy' },
          { name: 'Tomates fraîches', quantity: 2, unit: 'pcs', category: 'produce' },
          { name: 'Basilic frais', quantity: 10, unit: 'feuilles', category: 'produce' },
          { name: 'Huile d\'olive', quantity: 2, unit: 'cuillerées', category: 'pantry' }
        ],
        instructions: [
          'Préchauffez le four à 220°C',
          'Étalez la pâte sur une plaque de cuisson',
          'Étalez la sauce tomate sur la base',
          'Ajoutez des morceaux de mozzarella',
          'Enfournez pour 20-25 minutes',
          'Sortez du four et garnissez de basilic frais'
        ],
        householdId: 'household1',
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '3',
        title: 'Salade Buddha Bowl',
        description: 'Bowl végétarien coloré riche en nutriments',
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
        sourcePlatform: 'manual',
        prepTime: 20,
        cookTime: 0,
        totalTime: 20,
        difficulty: 'easy',
        servings: 2,
        mealType: 'lunch',
        tags: ['végétarien', 'santé', 'rapide'],
        toolsNeeded: ['Saladier', 'Couteau'],
        ingredients: [
          { name: 'Épinards frais', quantity: 100, unit: 'g', category: 'produce' },
          { name: 'Tomates cerises', quantity: 150, unit: 'g', category: 'produce' },
          { name: 'Carottes râpées', quantity: 100, unit: 'g', category: 'produce' },
          { name: 'Pois chiches', quantity: 200, unit: 'g', category: 'pantry' },
          { name: 'Avocat', quantity: 1, unit: 'pcs', category: 'produce' },
          { name: 'Feta', quantity: 100, unit: 'g', category: 'dairy' }
        ],
        instructions: [
          'Disposez les épinards en base du bol',
          'Ajoutez les tomates cerises coupées en deux',
          'Versez les carottes râpées',
          'Ajoutez les pois chiches',
          'Tranchez l\'avocat et disposez',
          'Émiettez la feta par-dessus'
        ],
        householdId: 'household1',
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '4',
        title: 'Burger Maison',
        description: 'Burger gourmand fait maison avec de la viande de qualité',
        imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
        sourcePlatform: 'manual',
        prepTime: 10,
        cookTime: 15,
        totalTime: 25,
        difficulty: 'medium',
        servings: 4,
        mealType: 'lunch',
        tags: ['américain', 'comfort food', 'rapide'],
        toolsNeeded: ['Poêle', 'Spatule'],
        ingredients: [
          { name: 'Hachis de bœuf', quantity: 600, unit: 'g', category: 'meat' },
          { name: 'Pain à burger', quantity: 4, unit: 'pcs', category: 'pantry' },
          { name: 'Cheddar', quantity: 4, unit: 'tranches', category: 'dairy' },
          { name: 'Tomates', quantity: 2, unit: 'pcs', category: 'produce' },
          { name: 'Laitue', quantity: 1, unit: 'pcs', category: 'produce' },
          { name: 'Sauce burger', quantity: 100, unit: 'ml', category: 'pantry' }
        ],
        instructions: [
          'Divisez la viande en 4 portions et formez des steaks hachés',
          'Faites cuire dans une poêle chaude 3-4 minutes de chaque côté',
          'Ajoutez le fromage les dernières minutes',
          'Grillé légèrement les pains',
          'Assemblez les burgers avec laitue, tomate et sauce'
        ],
        householdId: 'household1',
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '5',
        title: 'Tacos',
        description: 'Tacos mexicains avec viande épicée et garnitures fraiches',
        imageUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400',
        sourcePlatform: 'manual',
        prepTime: 10,
        cookTime: 15,
        totalTime: 25,
        difficulty: 'easy',
        servings: 4,
        mealType: 'dinner',
        tags: ['mexicain', 'rapide', 'épicé'],
        toolsNeeded: ['Poêle'],
        ingredients: [
          { name: 'Viande hachée', quantity: 500, unit: 'g', category: 'meat' },
          { name: 'Tortillas', quantity: 8, unit: 'pcs', category: 'pantry' },
          { name: 'Tomates', quantity: 2, unit: 'pcs', category: 'produce' },
          { name: 'Laitue', quantity: 1, unit: 'pcs', category: 'produce' },
          { name: 'Fromage râpé', quantity: 100, unit: 'g', category: 'dairy' },
          { name: 'Oignon', quantity: 1, unit: 'pcs', category: 'produce' },
          { name: 'Épices à tacos', quantity: 1, unit: 'sachet', category: 'spices' }
        ],
        instructions: [
          'Coupez les oignons finement',
          'Faites revenir l\'oignon dans une poêle',
          'Ajoutez la viande hachée et les épices à tacos',
          'Laissez cuire 5-7 minutes',
          'Coupez les tomates et déchiquetez la laitue',
          'Assemblez les tacos avec la viande, légumes et fromage'
        ],
        householdId: 'household1',
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    console.log('getRecipes returning', mockRecipes.length, 'recipes');
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
