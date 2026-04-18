import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonChip, IonSegment, IonSegmentButton,
  IonCard, IonCardContent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBack, time, flame, people, share, heart, heartOutline,
  checkmark, close, shareSocial, refresh
} from 'ionicons/icons';
import { RecipeService } from '../../services/recipe.service';
import { Recipe, Ingredient } from '../../models/recipe.model';

@Component({
  selector: 'app-recipe-detail',
  templateUrl: './recipe-detail.page.html',
  styleUrls: ['./recipe-detail.page.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonChip, IonSegment, IonSegmentButton,
    IonCard, IonCardContent
  ]
})
export class RecipeDetailPage implements OnInit {
  recipe: Recipe | null = null;
  isFavorite = false;
  selectedSegment = 'overview';
  ingredients: Ingredient[] = [];
  servings = 2;

  constructor(
    private route: ActivatedRoute,
    private recipeService: RecipeService
  ) {
    addIcons({ arrowBack, time, flame, people, share, heart, heartOutline, checkmark, close, shareSocial, refresh });
  }

  ngOnInit() {
    const recipeId = this.route.snapshot.paramMap.get('id');
    if (recipeId) {
      this.loadRecipe(recipeId);
    }
  }

  async loadRecipe(recipeId: string) {
    try {
      const recipes = await this.recipeService.getRecipes();
      this.recipe = recipes.find(r => r.id === recipeId) || null;
      if (this.recipe) {
        this.ingredients = this.recipe.ingredients || [];
        this.isFavorite = this.recipe.isFavorite || false;
      }
    } catch (error) {
      console.error('Error loading recipe:', error);
    }
  }

  goBack() {
    window.history.back();
  }

  toggleFavorite() {
    this.isFavorite = !this.isFavorite;
    if (this.recipe) {
      this.recipe.isFavorite = this.isFavorite;
    }
  }

  shareRecipe() {
    if (this.recipe && navigator.share) {
      navigator.share({
        title: this.recipe.title,
        text: `Regarde cette recette: ${this.recipe.title}`,
        url: window.location.href
      }).catch(err => console.log('Error sharing:', err));
    }
  }

  increaseServings() {
    this.servings += 1;
    this.adjustIngredients();
  }

  decreaseServings() {
    if (this.servings > 1) {
      this.servings -= 1;
      this.adjustIngredients();
    }
  }

  private adjustIngredients() {
    if (this.recipe?.servings) {
      const ratio = this.servings / this.recipe.servings;
      this.ingredients = (this.recipe.ingredients || []).map(ing => ({
        ...ing,
        quantity: ing.quantity ? ing.quantity * ratio : undefined
      }));
    }
  }

  getIngredientsForCategory(category: string): Ingredient[] {
    return this.ingredients.filter(i => i.category === category);
  }

  getDifficultyColor(difficulty?: string): string {
    switch (difficulty) {
      case 'easy':
        return 'success';
      case 'medium':
        return 'warning';
      case 'hard':
        return 'danger';
      default:
        return 'medium';
    }
  }

  getDifficultyLabel(difficulty?: string): string {
    switch (difficulty) {
      case 'easy':
        return 'Facile';
      case 'medium':
        return 'Moyen';
      case 'hard':
        return 'Difficile';
      default:
        return 'Non spécifié';
    }
  }

  getCategoryBadge(category?: string): string {
    const categoryMap: { [key: string]: string } = {
      'produce': '🥬 Fruits & Légumes',
      'meat': '🥩 Viande',
      'dairy': '🥛 Produits laitiers',
      'pantry': '📦 Épicerie',
      'spices': '🧂 Épices',
      'other': 'Autres'
    };
    return categoryMap[category || ''] || 'Autre';
  }
}
