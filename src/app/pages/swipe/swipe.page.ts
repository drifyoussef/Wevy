import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonCard, IonCardHeader, IonCardContent, IonSpinner, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close, closeOutline, restaurant, restaurantOutline, timeOutline, barChartOutline, heart, alertCircleOutline } from 'ionicons/icons';
import { RecipeService } from '../../services/recipe.service';
import { AuthService } from '../../services/auth.service';
import { HouseholdService } from '../../services/household.service';
import { Recipe } from '../../models/recipe.model';

@Component({
  selector: 'app-swipe',
  templateUrl: './swipe.page.html',
  styleUrls: ['./swipe.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonCard, IonCardHeader, IonCardContent, IonSpinner
  ]
})
export class SwipePage implements OnInit {
  loading = true;
  currentRecipes: Recipe[] = [];
  householdId: string | null = null;
  errorMessage: string | null = null;
  

  constructor(
    private recipeService: RecipeService,
    private authService: AuthService,
    private householdService: HouseholdService,
    private router: Router,
    private modalController: ModalController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ close, closeOutline, restaurant, restaurantOutline, timeOutline, barChartOutline, heart, alertCircleOutline });
  }

  async ngOnInit() {
    try {
      this.loading = true;
      this.cdr.markForCheck();
      
      const household = await this.householdService.getCurrentHousehold();
      
      if (!household) {
        console.error('No household found for user');
        this.errorMessage = 'Vous devez rejoindre ou créer un foyer';
        this.loading = false;
        this.cdr.markForCheck();
        return;
      }

      this.householdId = household.id;
      console.log('Household ID set to:', this.householdId);
      
      await this.loadSwipeSession();
    } catch (error) {
      console.error('Error in ngOnInit:', error);
      this.errorMessage = 'Erreur lors du chargement';
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async loadSwipeSession() {
    if (!this.householdId) {
      console.error('No householdId available');
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }
    
    try {
      this.loading = true;
      this.cdr.markForCheck();
      console.log('Loading recipes for household:', this.householdId);
      
      // Load all recipes from local service
      const allRecipes = await this.recipeService.getRecipes(this.householdId);
      console.log('Loaded recipes:', allRecipes.length, allRecipes);
      
      this.currentRecipes = Array.isArray(allRecipes) ? [...allRecipes] : [];
      console.log('Current recipes set to:', this.currentRecipes.length);
      
      if (this.currentRecipes.length === 0) {
        this.errorMessage = 'Aucune recette disponible';
      }
      
    } catch (error) {
      console.error('Error loading recipes:', error);
      this.errorMessage = 'Erreur lors du chargement des recettes';
      this.currentRecipes = [];
    } finally {
      this.loading = false;
      console.log('Loading finished, loading flag:', this.loading);
      this.cdr.markForCheck();
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
      this.cdr.markForCheck();
      
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
    console.log('Closing swipe modal...');
    await this.modalController.dismiss();
  }
}
