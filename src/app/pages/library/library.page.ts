import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, arrowForward, restaurant, restaurantOutline } from 'ionicons/icons';
import { RecipeService } from '../../services/recipe.service';
import { Recipe } from '../../models/recipe.model';
import { SwipePage } from '../swipe/swipe.page';

@Component({
  selector: 'app-library',
  templateUrl: './library.page.html',
  styleUrls: ['./library.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon
  ]
})
export class LibraryPage implements OnInit {
  recipes: Recipe[] = [];
  filteredRecipes: Recipe[] = [];

  constructor(
    private recipeService: RecipeService,
    private router: Router,
    private modalController: ModalController
  ) {
    addIcons({ add, arrowForward, restaurant, restaurantOutline });
  }

  ngOnInit() {
    this.loadRecipes();
  }

  async loadRecipes() {
    try {
      // TODO: Get household ID from auth
      const householdId = 'placeholder-household-id';
      this.recipes = await this.recipeService.getRecipes(householdId);
      this.filteredRecipes = this.recipes;
    } catch (error) {
      console.error('Error loading recipes:', error);
    }
  }

  openRecipeDetails(recipe: Recipe) {
    // TODO: Navigate to recipe details
    console.log('Opening recipe:', recipe.title);
  }

  async openSwipeMode() {
    const modal = await this.modalController.create({
      component: SwipePage,
      cssClass: 'fullscreen-modal'
    });
    await modal.present();
  }
}
