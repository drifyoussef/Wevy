import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonCard, IonCardHeader, IonCardContent, IonSpinner, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close, closeOutline, restaurant, restaurantOutline, timeOutline, barChartOutline, heart } from 'ionicons/icons';
import { RecipeService } from '../../services/recipe.service';
import { Recipe } from '../../models/recipe.model';

@Component({
  selector: 'app-swipe',
  templateUrl: './swipe.page.html',
  styleUrls: ['./swipe.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonCard, IonCardHeader, IonCardContent, IonSpinner
  ]
})
export class SwipePage implements OnInit {
  loading = true;
  currentRecipes: Recipe[] = [];
  householdId = 'placeholder-household-id'; // TODO: Get from auth

  constructor(
    private recipeService: RecipeService,
    private router: Router,
    private modalController: ModalController
  ) {
    addIcons({ close, closeOutline, restaurant, restaurantOutline, timeOutline, barChartOutline, heart });
  }

  async ngOnInit() {
    await this.loadSwipeSession();
  }

  async loadSwipeSession() {
    try {
      this.loading = true;
      
      // For now, work in local mode without Supabase
      // Load all recipes from local service
      const allRecipes = await this.recipeService.getRecipes(this.householdId);
      this.currentRecipes = [...allRecipes];
      
    } catch (error) {
      console.error('Error loading recipes:', error);
      this.currentRecipes = [];
    } finally {
      this.loading = false;
    }
  }

  async swipe(direction: 'left' | 'right') {
    if (this.currentRecipes.length === 0) return;
    
    const currentRecipe = this.currentRecipes[0];
    
    try {
      // For now, just remove the card (local mode)
      console.log(`Swiped ${direction} on:`, currentRecipe.title);
      
      // Remove the card with animation
      this.currentRecipes = this.currentRecipes.slice(1);
      
      // If swiped right, consider it selected
      if (direction === 'right' && this.currentRecipes.length === 0) {
        console.log('Selected recipe!', currentRecipe.title);
        // Could show a success message or navigate
        await this.close();
      }
      
    } catch (error) {
      console.error('Error recording swipe:', error);
    }
  }

  async close() {
    await this.modalController.dismiss();
  }
}
