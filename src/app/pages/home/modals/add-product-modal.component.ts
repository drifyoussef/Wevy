import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
  IonInput, IonButtons, ModalController, IonSelect, IonSelectOption
} from '@ionic/angular/standalone';
import { ShoppingListService } from '../../../services/shopping-list.service';

@Component({
  selector: 'app-add-product-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
    IonInput, IonButtons, IonSelect, IonSelectOption
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Ajouter un produit</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">Annuler</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Nom du produit -->
      <div class="form-field">
        <label class="field-label">Nom du produit *</label>
        <ion-input
          #productNameInput
          [(ngModel)]="productName"
          name="productName"
          placeholder="Ex: Lait, Pain, Tomates..."
          type="text"
          fill="outline"
          class="custom-input"
        ></ion-input>
      </div>

      <!-- Quantité -->
      <div class="form-field">
        <label class="field-label">Quantité *</label>
        <ion-input
          #quantityInput
          [(ngModel)]="quantity"
          name="quantity"
          placeholder="Ex: 2, 500, 1..."
          type="number"
          min="0"
          step="0.1"
          fill="outline"
          class="custom-input"
        ></ion-input>
      </div>

      <!-- Unité -->
      <div class="form-field">
        <label class="field-label">Unité *</label>
        <ion-select
          [(ngModel)]="unit"
          name="unit"
          placeholder="Sélectionner une unité"
          fill="outline"
          class="custom-input"
        >
          <ion-select-option value="pcs">Pièces (pcs)</ion-select-option>
          <ion-select-option value="g">Grammes (g)</ion-select-option>
          <ion-select-option value="kg">Kilogrammes (kg)</ion-select-option>
          <ion-select-option value="ml">Millilitres (ml)</ion-select-option>
          <ion-select-option value="L">Litres (L)</ion-select-option>
          <ion-select-option value="cup">Tasse (cup)</ion-select-option>
          <ion-select-option value="tbsp">Cuillère à soupe (tbsp)</ion-select-option>
          <ion-select-option value="tsp">Cuillère à café (tsp)</ion-select-option>
          <ion-select-option value="oz">Ounces (oz)</ion-select-option>
          <ion-select-option value="lb">Livres (lb)</ion-select-option>
          <ion-select-option value="bunch">Botte (bunch)</ion-select-option>
          <ion-select-option value="clove">Gousse (clove)</ion-select-option>
        </ion-select>
      </div>

      <!-- Catégorie -->
      <div class="form-field">
        <label class="field-label">Catégorie</label>
        <ion-select
          [(ngModel)]="category"
          name="category"
          placeholder="Sélectionner une catégorie"
          fill="outline"
          class="custom-input"
        >
          <ion-select-option value="produce">Fruits & Légumes</ion-select-option>
          <ion-select-option value="meat">Viande & Poisson</ion-select-option>
          <ion-select-option value="dairy">Produits laitiers</ion-select-option>
          <ion-select-option value="pantry">Épicerie</ion-select-option>
          <ion-select-option value="spices">Épices</ion-select-option>
          <ion-select-option value="other">Autre</ion-select-option>
        </ion-select>
      </div>

      <ion-button
        expand="block"
        (click)="addProduct()"
        [disabled]="!isFormValid()"
        class="mt-6"
      >
        Ajouter à la liste
      </ion-button>
    </ion-content>
  `,
  styles: [`
    .form-field {
      margin-bottom: 16px;
    }

    .field-label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: var(--ion-color-dark);
      margin: 0 0 8px 4px;
    }

    .custom-input {
      --background: var(--ion-color-light);
      --border-radius: 16px;
      --border-color: transparent;
      --border-width: 1.5px;
      --highlight-color-focused: var(--ion-color-primary);
      --padding-start: 16px;
      --padding-end: 16px;
      --padding-top: 14px;
      --padding-bottom: 14px;
      font-size: 16px;
    }

    .mt-6 {
      margin-top: 24px;
    }
  `]
})
export class AddProductModalComponent implements OnInit {
  productName: string = '';
  quantity: number | null = null;
  unit: string = 'pcs';
  category: string = 'other';

  constructor(
    private modalController: ModalController,
    private shoppingService: ShoppingListService
  ) {}

  ngOnInit() {
    // Initialiser avec les valeurs par défaut
    this.unit = 'pcs';
    this.category = 'other';
  }

  isFormValid(): boolean {
    return this.productName.trim().length > 0 && 
           this.quantity !== null && 
           this.quantity > 0 && 
           this.unit.length > 0;
  }

  dismiss() {
    this.modalController.dismiss();
  }

  async addProduct() {
    if (!this.isFormValid()) return;

    try {
      await this.shoppingService.addManualItem(
        this.productName.trim(),
        this.quantity!,
        this.unit,
        this.category as 'produce' | 'meat' | 'dairy' | 'pantry' | 'spices' | 'other'
      );

      // Fermer le modal avec succès
      this.modalController.dismiss({
        added: true,
        product: {
          name: this.productName.trim(),
          quantity: this.quantity,
          unit: this.unit,
          category: this.category
        }
      });
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Erreur lors de l\'ajout du produit');
    }
  }
}
