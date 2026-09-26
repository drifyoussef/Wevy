import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonBackButton, IonIcon,
  AlertController, NavController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  heart, heartOutline, restaurantOutline, timeOutline, flameOutline, peopleOutline, cutOutline,
  constructOutline, pricetagOutline, add, remove, basketOutline, listOutline, shareSocialOutline,
  openOutline, trashOutline
} from 'ionicons/icons';
import { RecipeService } from '../../services/recipe.service';
import { ToastService } from '../../services/toast.service';
import { Recipe, Ingredient } from '../../models/recipe.model';

type IngredientCategory = NonNullable<Ingredient['category']>;

/** Display order and labels of the ingredient groups. */
const CATEGORIES: { category: IngredientCategory; label: string }[] = [
  { category: 'produce', label: 'Fruits & légumes' },
  { category: 'meat', label: 'Viande & poisson' },
  { category: 'dairy', label: 'Produits laitiers' },
  { category: 'pantry', label: 'Épicerie' },
  { category: 'spices', label: 'Épices' },
  { category: 'other', label: 'Autres' },
];

const MEAL_TYPE_LABELS: Record<NonNullable<Recipe['mealType']>, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'En-cas',
  dessert: 'Dessert',
};

interface IngredientGroup {
  category: IngredientCategory;
  label: string;
  items: Ingredient[];
}

@Component({
  selector: 'app-recipe-detail',
  templateUrl: './recipe-detail.page.html',
  styleUrls: ['./recipe-detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonBackButton, IonIcon
  ]
})
export class RecipeDetailPage implements OnInit {
  recipe: Recipe | null = null;
  loaded = false;
  isFavorite = false;
  ingredients: Ingredient[] = [];
  ingredientGroups: IngredientGroup[] = [];
  servings = 2;

  constructor(
    private route: ActivatedRoute,
    private recipeService: RecipeService,
    private toastService: ToastService,
    private alertController: AlertController,
    private navController: NavController
  ) {
    addIcons({
      heart, heartOutline, restaurantOutline, timeOutline, flameOutline, peopleOutline, cutOutline,
      constructOutline, pricetagOutline, add, remove, basketOutline, listOutline, shareSocialOutline,
      openOutline, trashOutline
    });
  }

  ngOnInit() {
    const recipeId = this.route.snapshot.paramMap.get('id');
    if (recipeId) {
      this.loadRecipe(recipeId);
    } else {
      this.loaded = true;
    }
  }

  async loadRecipe(recipeId: string) {
    try {
      this.recipe = await this.recipeService.getRecipeById(recipeId);
      if (this.recipe) {
        this.isFavorite = this.recipe.isFavorite || false;
        // Start from the recipe's own yield so the quantities shown match the stepper
        this.servings = this.recipe.servings || this.servings;
        this.adjustIngredients();
      }
    } catch (error) {
      console.error('Error loading recipe:', error);
    } finally {
      this.loaded = true;
    }
  }

  /** Optimistic: the heart flips at once and goes back if the server refuses. */
  async toggleFavorite() {
    if (!this.recipe) return;

    this.isFavorite = !this.isFavorite;
    try {
      const updated = await this.recipeService.toggleFavorite(this.recipe.id);
      this.recipe.isFavorite = updated.isFavorite;
      this.isFavorite = Boolean(updated.isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      this.isFavorite = !this.isFavorite;
      this.toastService.error('Impossible de modifier les favoris');
    }
  }

  get sourceLabel(): string {
    switch (this.recipe?.sourcePlatform) {
      case 'tiktok': return 'Voir la vidéo TikTok';
      case 'instagram': return 'Voir la publication Instagram';
      case 'facebook': return 'Voir la publication Facebook';
      case 'youtube': return 'Voir la vidéo YouTube';
      default: return 'Voir la recette d’origine';
    }
  }

  async deleteRecipe() {
    if (!this.recipe) return;

    const alert = await this.alertController.create({
      header: 'Supprimer la recette ?',
      message: `« ${this.recipe.title} » sera supprimée pour tout le foyer.`,
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        { text: 'Supprimer', role: 'destructive' }
      ]
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'destructive') return;

    try {
      await this.recipeService.deleteRecipe(this.recipe.id);
      this.toastService.success('Recette supprimée');
      this.navController.navigateBack('/tabs/library');
    } catch (error) {
      console.error('Error deleting recipe:', error);
      this.toastService.error('Impossible de supprimer la recette');
    }
  }

  async shareRecipe() {
    if (!this.recipe) return;

    // No share sheet (desktop browsers): copy the link instead
    if (!navigator.share) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        this.toastService.success('Lien de la recette copié');
      } catch {
        this.toastService.error('Impossible de copier le lien');
      }
      return;
    }

    navigator.share({
      title: this.recipe.title,
      text: `Regarde cette recette : ${this.recipe.title}`,
      url: window.location.href
    }).catch(err => console.log('Error sharing:', err));
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

  /** "200 g", "1,5 c. à soupe", or nothing for "sel, poivre" style ingredients. */
  formatQuantity(ingredient: Ingredient): string {
    if (!ingredient.quantity) {
      return ingredient.unit || '';
    }

    const rounded = Math.round(ingredient.quantity * 100) / 100;
    const quantity = rounded.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
    return ingredient.unit ? `${quantity} ${ingredient.unit}` : quantity;
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

  getMealTypeLabel(mealType: NonNullable<Recipe['mealType']>): string {
    return MEAL_TYPE_LABELS[mealType] ?? mealType;
  }

  private adjustIngredients() {
    const base = this.recipe?.ingredients || [];
    const ratio = this.recipe?.servings ? this.servings / this.recipe.servings : 1;

    this.ingredients = base.map(ing => ({
      ...ing,
      quantity: ing.quantity ? ing.quantity * ratio : undefined
    }));
    this.groupIngredients();
  }

  private groupIngredients() {
    this.ingredientGroups = CATEGORIES
      .map(({ category, label }) => ({
        category,
        label,
        // An ingredient without a category goes to "Autres" instead of disappearing
        items: this.ingredients.filter(i => (i.category || 'other') === category)
      }))
      .filter(group => group.items.length > 0);
  }
}
