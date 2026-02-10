import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList,
  IonItem, IonLabel, IonInput, IonTextarea, IonButton,
  IonIcon, IonSelect, IonSelectOption, IonSegment,
  IonSegmentButton, IonCard, IonCardContent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { link, camera, close, add } from 'ionicons/icons';
import { RecipeService } from '../../services/recipe.service';
import { Recipe, Ingredient } from '../../models/recipe.model';

@Component({
  selector: 'app-add-recipe',
  templateUrl: './add-recipe.page.html',
  styleUrls: ['./add-recipe.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonList,
    IonItem, IonLabel, IonInput, IonTextarea, IonButton,
    IonIcon, IonSelect, IonSelectOption, IonSegment,
    IonSegmentButton, IonCard, IonCardContent
  ]
})
export class AddRecipePage {
  addMethod: 'url' | 'manual' = 'url';
  recipeUrl = '';
  extracting = false;

  // Manual form fields
  recipe: Partial<Recipe> = {
    title: '',
    description: '',
    ingredients: [],
    prepTime: 0,
    cookTime: 0,
    difficulty: 'medium',
    servings: 2,
    mealType: 'dinner'
  };

  newIngredient: Ingredient = {
    name: '',
    quantity: 0,
    unit: ''
  };

  constructor(
    private recipeService: RecipeService,
    private router: Router
  ) {
    addIcons({ link, camera, close, add });
  }

  onRecipeUrlChange(event: any) {
    this.recipeUrl = event.detail.value || '';
  }

  onTitleChange(event: any) {
    this.recipe.title = event.detail.value || '';
  }

  onDescriptionChange(event: any) {
    this.recipe.description = event.detail.value || '';
  }

  onPrepTimeChange(event: any) {
    this.recipe.prepTime = Number(event.detail.value) || 0;
  }

  onCookTimeChange(event: any) {
    this.recipe.cookTime = Number(event.detail.value) || 0;
  }

  onServingsChange(event: any) {
    this.recipe.servings = Number(event.detail.value) || 0;
  }

  onIngredientNameChange(event: any) {
    this.newIngredient.name = event.detail.value || '';
  }

  onIngredientQuantityChange(event: any) {
    this.newIngredient.quantity = Number(event.detail.value) || 0;
  }

  onIngredientUnitChange(event: any) {
    this.newIngredient.unit = event.detail.value || '';
  }

  onMethodChange(event: CustomEvent) {
    this.addMethod = event.detail.value as 'url' | 'manual';
  }

  async extractFromUrl() {
    if (!this.recipeUrl) return;

    try {
      this.extracting = true;
      const extractedData = await this.recipeService.extractRecipeFromUrl(this.recipeUrl);
      this.recipe = { ...this.recipe, ...extractedData };
      this.addMethod = 'manual'; // Switch to manual mode to review/edit
    } catch (error) {
      console.error('Error extracting recipe:', error);
      // TODO: Show error toast
    } finally {
      this.extracting = false;
    }
  }

  addIngredient() {
    if (this.newIngredient.name) {
      this.recipe.ingredients = [
        ...(this.recipe.ingredients || []),
        { ...this.newIngredient }
      ];
      
      // Reset form
      this.newIngredient = {
        name: '',
        quantity: 0,
        unit: ''
      };
    }
  }

  removeIngredient(index: number) {
    this.recipe.ingredients = this.recipe.ingredients?.filter((_, i) => i !== index);
  }

  async saveRecipe() {
    try {
      // TODO: Get household ID and user ID from auth
      const householdId = 'placeholder-household-id';
      const userId = 'placeholder-user-id';

      const recipeData: Partial<Recipe> = {
        ...this.recipe,
        householdId,
        createdBy: userId,
        totalTime: (this.recipe.prepTime || 0) + (this.recipe.cookTime || 0)
      };

      await this.recipeService.createRecipe(recipeData);
      
      // Navigate back to library
      this.router.navigate(['/tabs/library']);
      
      // TODO: Show success toast
    } catch (error) {
      console.error('Error saving recipe:', error);
      // TODO: Show error toast
    }
  }
}
