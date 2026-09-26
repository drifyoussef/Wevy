import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonIcon, IonSpinner,
  NavController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  sparkles, logoTiktok, logoInstagram, logoFacebook, logoYoutube, globeOutline, clipboardOutline,
  createOutline, chevronForward, close, add, alertCircleOutline, refreshOutline, videocamOutline,
  documentTextOutline, openOutline, restaurantOutline, trashOutline
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { RecipeService, RecipeImportMeta } from '../../services/recipe.service';
import { ToastService } from '../../services/toast.service';
import { Recipe, Ingredient } from '../../models/recipe.model';

type Step = 'start' | 'importing' | 'error' | 'edit';
type Difficulty = NonNullable<Recipe['difficulty']>;
type MealType = NonNullable<Recipe['mealType']>;

/** Shown one after the other while the AI works: the request gives no progress of its own. */
const IMPORT_MESSAGES = [
  'Lecture du lien…',
  'Récupération de la vidéo…',
  "L'IA regarde et écoute la vidéo…",
  'Repérage des ingrédients et des quantités…',
  'Écriture des étapes…',
  'Encore quelques secondes…'
];
const IMPORT_MESSAGE_MS = 7000;

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Facile' },
  { id: 'medium', label: 'Moyen' },
  { id: 'hard', label: 'Difficile' },
];

const MEAL_TYPES: { id: MealType; label: string }[] = [
  { id: 'breakfast', label: 'Petit-déj' },
  { id: 'lunch', label: 'Déjeuner' },
  { id: 'dinner', label: 'Dîner' },
  { id: 'snack', label: 'En-cas' },
  { id: 'dessert', label: 'Dessert' },
];

interface EditableRecipe {
  title: string;
  description: string;
  imageUrl?: string;
  sourceUrl?: string;
  sourcePlatform?: Recipe['sourcePlatform'];
  prepTime: number | null;
  cookTime: number | null;
  servings: number | null;
  difficulty?: Difficulty;
  mealType?: MealType;
  tags: string[];
  ingredients: Ingredient[];
  instructions: string[];
}

@Component({
  selector: 'app-add-recipe',
  templateUrl: './add-recipe.page.html',
  styleUrls: ['./add-recipe.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonIcon, IonSpinner
  ]
})
export class AddRecipePage implements OnInit, OnDestroy {
  readonly difficulties = DIFFICULTIES;
  readonly mealTypes = MEAL_TYPES;

  step: Step = 'start';
  url = '';
  importMessage = IMPORT_MESSAGES[0];
  importError = '';
  importMeta: RecipeImportMeta | null = null;

  recipe: EditableRecipe = this.emptyRecipe();
  newTag = '';
  saving = false;

  private importId = 0;
  private messageTimer?: ReturnType<typeof setInterval>;
  private querySubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private recipeService: RecipeService,
    private toastService: ToastService,
    private navController: NavController
  ) {
    addIcons({
      sparkles, logoTiktok, logoInstagram, logoFacebook, logoYoutube, globeOutline, clipboardOutline,
      createOutline, chevronForward, close, add, alertCircleOutline, refreshOutline, videocamOutline,
      documentTextOutline, openOutline, restaurantOutline, trashOutline
    });
  }

  ngOnInit() {
    // /tabs/add-recipe?url=... (share sheet, deep link): import straight away
    this.querySubscription = this.route.queryParamMap.subscribe(params => {
      const sharedUrl = params.get('url');
      if (sharedUrl && sharedUrl !== this.url) {
        this.url = sharedUrl;
        this.importFromUrl();
      }
    });
  }

  ngOnDestroy() {
    this.querySubscription?.unsubscribe();
    this.stopMessages();
  }

  get canImport(): boolean {
    return /^https?:\/\/\S+\.\S+/i.test(this.url.trim());
  }

  get canSave(): boolean {
    return this.recipe.title.trim().length > 0 && this.recipe.ingredients.some(i => i.name.trim());
  }

  // ---------- Import ----------

  async pasteFromClipboard() {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      // Shares often come as "Look at this recipe! https://..." : keep the link only
      const link = text.match(/https?:\/\/\S+/i)?.[0];
      if (link) {
        this.url = link;
      } else {
        this.toastService.error('Aucun lien dans le presse-papiers');
      }
    } catch {
      this.toastService.error("Impossible de lire le presse-papiers : colle le lien à la main");
    }
  }

  async importFromUrl() {
    const link = this.url.trim().match(/https?:\/\/\S+/i)?.[0];
    if (!link) return;

    const id = ++this.importId;
    this.url = link;
    this.step = 'importing';
    this.importError = '';
    this.startMessages();

    try {
      const { recipe, meta } = await this.recipeService.extractRecipeFromUrl(link);
      if (id !== this.importId) return; // cancelled meanwhile

      this.importMeta = meta;
      this.recipe = {
        ...this.emptyRecipe(),
        title: recipe.title || '',
        description: recipe.description || '',
        imageUrl: recipe.imageUrl,
        sourceUrl: recipe.sourceUrl || link,
        sourcePlatform: recipe.sourcePlatform,
        prepTime: recipe.prepTime ?? null,
        cookTime: recipe.cookTime ?? null,
        servings: recipe.servings ?? null,
        difficulty: recipe.difficulty,
        mealType: recipe.mealType,
        tags: recipe.tags || [],
        ingredients: (recipe.ingredients || []).map(ingredient => ({ ...ingredient, unit: ingredient.unit || '' })),
        instructions: recipe.instructions || []
      };
      if (this.recipe.instructions.length === 0) this.recipe.instructions = [''];
      this.step = 'edit';
    } catch (error) {
      if (id !== this.importId) return;
      console.error('Error importing recipe:', error);
      this.importError = (error as Error).message || "Impossible d'importer cette recette";
      this.step = 'error';
    } finally {
      if (id === this.importId) this.stopMessages();
    }
  }

  cancelImport() {
    this.importId++; // the pending answer will be ignored
    this.stopMessages();
    this.step = 'start';
  }

  startManual() {
    this.importMeta = null;
    this.recipe = this.emptyRecipe();
    this.step = 'edit';
  }

  backToStart() {
    this.step = 'start';
  }

  platformIcon(platform?: string): string {
    switch (platform) {
      case 'tiktok': return 'logo-tiktok';
      case 'instagram': return 'logo-instagram';
      case 'facebook': return 'logo-facebook';
      case 'youtube': return 'logo-youtube';
      default: return 'globe-outline';
    }
  }

  // ---------- Editing ----------

  setDifficulty(id: Difficulty) {
    this.recipe.difficulty = this.recipe.difficulty === id ? undefined : id;
  }

  setMealType(id: MealType) {
    this.recipe.mealType = this.recipe.mealType === id ? undefined : id;
  }

  addTag() {
    const tag = this.newTag.trim().toLowerCase().replace(/^#/, '');
    if (tag && !this.recipe.tags.includes(tag)) {
      this.recipe.tags = [...this.recipe.tags, tag];
    }
    this.newTag = '';
  }

  removeTag(tag: string) {
    this.recipe.tags = this.recipe.tags.filter(t => t !== tag);
  }

  addIngredient() {
    this.recipe.ingredients = [...this.recipe.ingredients, { name: '', quantity: undefined, unit: '', category: 'other' }];
  }

  removeIngredient(index: number) {
    this.recipe.ingredients = this.recipe.ingredients.filter((_, i) => i !== index);
  }

  addStep() {
    this.recipe.instructions = [...this.recipe.instructions, ''];
  }

  removeStep(index: number) {
    this.recipe.instructions = this.recipe.instructions.filter((_, i) => i !== index);
  }

  removeImage() {
    this.recipe.imageUrl = undefined;
  }

  async saveRecipe() {
    if (!this.canSave || this.saving) return;

    const prepTime = this.positiveOrUndefined(this.recipe.prepTime);
    const cookTime = this.positiveOrUndefined(this.recipe.cookTime);

    const data: Partial<Recipe> = {
      title: this.recipe.title.trim(),
      description: this.recipe.description.trim() || undefined,
      imageUrl: this.recipe.imageUrl,
      sourceUrl: this.recipe.sourceUrl,
      sourcePlatform: this.recipe.sourcePlatform || (this.recipe.sourceUrl ? 'url' : 'manual'),
      prepTime,
      cookTime,
      totalTime: prepTime || cookTime ? (prepTime || 0) + (cookTime || 0) : undefined,
      servings: this.positiveOrUndefined(this.recipe.servings),
      difficulty: this.recipe.difficulty,
      mealType: this.recipe.mealType,
      tags: this.recipe.tags,
      ingredients: this.recipe.ingredients
        .filter(ingredient => ingredient.name.trim())
        .map(ingredient => ({
          name: ingredient.name.trim(),
          quantity: this.positiveOrUndefined(ingredient.quantity),
          unit: (ingredient.unit || '').trim(),
          category: ingredient.category || 'other'
        })),
      instructions: this.recipe.instructions.map(step => step.trim()).filter(Boolean)
    };

    this.saving = true;
    try {
      const created = await this.recipeService.createRecipe(data);
      this.toastService.success('Recette ajoutée !');
      // Replace the form in the history: back from the recipe goes to the library
      this.navController.navigateForward(['/tabs/library/recipe', created.id], { replaceUrl: true });
      this.resetPage();
    } catch (error) {
      console.error('Error saving recipe:', error);
      this.toastService.error((error as Error).message || "Erreur lors de l'enregistrement de la recette");
    } finally {
      this.saving = false;
    }
  }

  // ---------- Helpers ----------

  private resetPage() {
    this.step = 'start';
    this.url = '';
    this.importMeta = null;
    this.recipe = this.emptyRecipe();
  }

  private positiveOrUndefined(value: number | null | undefined): number | undefined {
    const number = Number(value);
    return value !== null && value !== undefined && Number.isFinite(number) && number > 0 ? number : undefined;
  }

  private startMessages() {
    let index = 0;
    this.importMessage = IMPORT_MESSAGES[0];
    this.stopMessages();
    this.messageTimer = setInterval(() => {
      index = Math.min(index + 1, IMPORT_MESSAGES.length - 1);
      this.importMessage = IMPORT_MESSAGES[index];
    }, IMPORT_MESSAGE_MS);
  }

  private stopMessages() {
    if (this.messageTimer) {
      clearInterval(this.messageTimer);
      this.messageTimer = undefined;
    }
  }

  private emptyRecipe(): EditableRecipe {
    return {
      title: '',
      description: '',
      prepTime: null,
      cookTime: null,
      servings: null,
      tags: [],
      ingredients: [{ name: '', quantity: undefined, unit: '', category: 'other' }],
      instructions: ['']
    };
  }
}
