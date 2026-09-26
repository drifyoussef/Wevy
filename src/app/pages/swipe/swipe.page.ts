import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonIcon, IonSpinner, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  close, restaurantOutline, timeOutline, flameOutline, heart, alertCircleOutline, refreshOutline,
  chevronForward, heartDislikeOutline
} from 'ionicons/icons';
import { RecipeService } from '../../services/recipe.service';
import { HouseholdService } from '../../services/household.service';
import { Recipe } from '../../models/recipe.model';

type Direction = 'left' | 'right';

const DIFFICULTY_LABELS: Record<NonNullable<Recipe['difficulty']>, string> = {
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
};

/** How far (px) the card must be dragged before letting go counts as a swipe. */
const SWIPE_THRESHOLD = 110;
/**
 * Button / keyboard swipes first lean the card this far (full MIAM / BOF stamp) for
 * NUDGE_MS, so the decision can be read before the card leaves.
 * NUDGE_MS must cover the .swipe-card transform transition in the stylesheet.
 */
const NUDGE_PX = SWIPE_THRESHOLD;
const NUDGE_MS = 300;
/** Must match the .leaving transform transition duration in the stylesheet. */
const FLY_OUT_MS = 550;
const MAX_CARD_TAGS = 3;

@Component({
  selector: 'app-swipe',
  templateUrl: './swipe.page.html',
  styleUrls: ['./swipe.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonIcon, IonSpinner
  ]
})
export class SwipePage implements OnInit {
  readonly maxCardTags = MAX_CARD_TAGS;

  loading = true;
  errorMessage: string | null = null;
  householdId: string | null = null;

  private allRecipes: Recipe[] = [];
  currentRecipes: Recipe[] = [];
  likedRecipes: Recipe[] = [];
  total = 0;

  // Drag state of the top card
  dragX = 0;
  dragY = 0;
  dragging = false;
  leaving: Direction | null = null;
  /** A button swipe is showing its stamp before the card leaves. */
  private deciding = false;
  private pointerStart: { x: number; y: number } | null = null;

  constructor(
    private recipeService: RecipeService,
    private householdService: HouseholdService,
    private router: Router,
    private modalController: ModalController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({
      close, restaurantOutline, timeOutline, flameOutline, heart, alertCircleOutline, refreshOutline,
      chevronForward, heartDislikeOutline
    });
  }

  async ngOnInit() {
    try {
      const household = await this.householdService.getCurrentHousehold();
      if (!household) {
        this.errorMessage = this.householdService.loadState === 'error'
          ? 'Impossible de charger ton foyer. Vérifie ta connexion et réessaie.'
          : 'Tu dois rejoindre ou créer un foyer pour utiliser le mode swipe.';
        return;
      }

      this.householdId = household.id;
      await this.loadSwipeSession();
    } catch (error) {
      console.error('Error in ngOnInit:', error);
      this.errorMessage = 'Erreur lors du chargement';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async loadSwipeSession() {
    if (!this.householdId) return;

    try {
      const recipes = await this.recipeService.getRecipes(this.householdId);
      this.allRecipes = Array.isArray(recipes) ? recipes : [];
      if (this.allRecipes.length === 0) {
        this.errorMessage = 'Aucune recette disponible. Ajoute des recettes pour commencer.';
      }
      this.restart();
    } catch (error) {
      console.error('Error loading recipes:', error);
      this.errorMessage = 'Erreur lors du chargement des recettes';
    }
  }

  get progress(): number {
    return this.total ? (this.total - this.currentRecipes.length) / this.total : 0;
  }

  get finished(): boolean {
    return this.total > 0 && this.currentRecipes.length === 0;
  }

  /** Transform of the top card: follows the finger, tilts with it, flies off when swiped. */
  get topCardTransform(): string {
    if (this.leaving) {
      // Just past the edge of the screen: a longer trip only makes the card look faster
      const distance = window.innerWidth + 150;
      const x = this.leaving === 'right' ? distance : -distance;
      return `translate(${x}px, ${this.dragY}px) rotate(${this.leaving === 'right' ? 20 : -20}deg)`;
    }
    return `translate(${this.dragX}px, ${this.dragY}px) rotate(${this.dragX * 0.06}deg)`;
  }

  /** 0 → 1 as the card is dragged towards a decision, drives the LIKE / NOPE stamps. */
  get likeOpacity(): number {
    return this.leaving === 'right' ? 1 : Math.min(Math.max(this.dragX / SWIPE_THRESHOLD, 0), 1);
  }

  get nopeOpacity(): number {
    return this.leaving === 'left' ? 1 : Math.min(Math.max(-this.dragX / SWIPE_THRESHOLD, 0), 1);
  }

  difficultyLabel(difficulty: NonNullable<Recipe['difficulty']>): string {
    return DIFFICULTY_LABELS[difficulty];
  }

  onPointerDown(event: PointerEvent) {
    if (this.leaving || this.deciding) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.pointerStart = { x: event.clientX, y: event.clientY };
    this.dragging = true;
  }

  onPointerMove(event: PointerEvent) {
    if (!this.dragging || !this.pointerStart) return;
    this.dragX = event.clientX - this.pointerStart.x;
    // Vertical movement is damped so the card mostly moves sideways
    this.dragY = (event.clientY - this.pointerStart.y) * 0.3;
    this.cdr.markForCheck();
  }

  onPointerUp() {
    if (!this.dragging) return;
    this.dragging = false;
    this.pointerStart = null;

    if (Math.abs(this.dragX) > SWIPE_THRESHOLD) {
      // Already leaning with the stamp showing: no need for the nudge
      this.flyOut(this.dragX > 0 ? 'right' : 'left');
    } else {
      // Not far enough: spring back to the middle
      this.dragX = 0;
      this.dragY = 0;
      this.cdr.markForCheck();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') {
      this.swipe('left');
    } else if (event.key === 'ArrowRight') {
      this.swipe('right');
    }
  }

  /** Button / keyboard swipe: lean the card with its stamp, then let it go. */
  swipe(direction: Direction) {
    if (this.leaving || this.deciding || this.currentRecipes.length === 0) return;

    this.deciding = true;
    this.dragX = direction === 'right' ? NUDGE_PX : -NUDGE_PX;
    this.cdr.markForCheck();

    setTimeout(() => {
      this.deciding = false;
      this.flyOut(direction);
    }, NUDGE_MS);
  }

  private flyOut(direction: Direction) {
    if (this.leaving || this.currentRecipes.length === 0) return;

    const recipe = this.currentRecipes[0];
    this.leaving = direction;
    this.cdr.markForCheck();

    setTimeout(() => {
      if (direction === 'right') {
        this.likedRecipes = [...this.likedRecipes, recipe];
      }
      this.currentRecipes = this.currentRecipes.slice(1);
      this.leaving = null;
      this.dragX = 0;
      this.dragY = 0;
      this.cdr.markForCheck();
    }, FLY_OUT_MS);
  }

  restart() {
    this.currentRecipes = [...this.allRecipes];
    this.total = this.currentRecipes.length;
    this.likedRecipes = [];
    this.cdr.markForCheck();
  }

  async openRecipe(recipe: Recipe) {
    await this.modalController.dismiss();
    this.router.navigate(['/tabs/library/recipe', recipe.id]);
  }

  async close() {
    await this.modalController.dismiss();
  }
}
