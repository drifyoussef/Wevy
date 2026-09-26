import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonInput,
  IonButtons, IonBackButton, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, cartOutline, checkmark, checkmarkDone, close } from 'ionicons/icons';
import { ShoppingListService } from '../../services/shopping-list.service';
import { ShoppingListItem } from '../../models/shopping-list.model';
import { Subscription } from 'rxjs';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-shopping',
  templateUrl: './shopping.page.html',
  styleUrls: ['./shopping.page.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonInput,
    IonButtons, IonBackButton
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShoppingPage implements OnInit, OnDestroy {
  uncheckedItems: ShoppingListItem[] = [];
  checkedItems: ShoppingListItem[] = [];
  newItemName: string = '';
  adding = false;
  removingIds = new Set<string>();
  clearing = false;
  private listSubscription?: Subscription;

  constructor(
    private shoppingService: ShoppingListService,
    private toastService: ToastService,
    private alertController: AlertController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ add, cartOutline, checkmark, checkmarkDone, close });
  }

  ngOnInit() {
    // Subscribe to shopping list updates
    this.listSubscription = this.shoppingService.currentList$.subscribe(list => {
      if (list) {
        this.uncheckedItems = list.items.filter(item => !item.isChecked);
        this.checkedItems = list.items.filter(item => item.isChecked);
      }
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy() {
    this.listSubscription?.unsubscribe();
  }

  get totalItems(): number {
    return this.uncheckedItems.length + this.checkedItems.length;
  }

  async quickAdd() {
    const name = this.newItemName.trim();
    if (!name || this.adding) return;

    this.adding = true;
    try {
      await this.shoppingService.addManualItem(name, 1, 'pcs', 'other');
      this.newItemName = '';
      this.toastService.success('Produit ajouté !');
    } catch (error) {
      console.error('Error adding item:', error);
      this.toastService.error("Erreur lors de l'ajout du produit");
    } finally {
      this.adding = false;
      this.cdr.markForCheck();
    }
  }

  async toggleItem(itemId: string) {
    try {
      await this.shoppingService.toggleItem(itemId);
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  }

  deleteItem(itemId: string, event: Event) {
    // Keep the card click (toggle) from firing when the delete badge is tapped
    event.stopPropagation();

    // Slide the card out to the right (Tinder-style) before actually removing it
    this.removingIds.add(itemId);
    this.cdr.markForCheck();

    setTimeout(async () => {
      try {
        await this.shoppingService.removeItem(itemId);
      } catch (error) {
        console.error('Error removing item:', error);
      } finally {
        this.removingIds.delete(itemId);
        this.cdr.markForCheck();
      }
    }, 280);
  }

  async finishList() {
    const total = this.totalItems;
    if (!total || this.clearing) {
      return;
    }

    const alert = await this.alertController.create({
      header: 'Terminer la liste ?',
      message: total === 1
        ? 'Le produit de la liste sera définitivement supprimé, acheté ou non.'
        : `Les ${total} produits de la liste seront définitivement supprimés, achetés ou non.`,
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        { text: 'Terminer', role: 'destructive', handler: () => { this.clearList(); } }
      ]
    });

    await alert.present();
  }

  private clearList() {
    this.clearing = true;

    // Reuse the per-card slide-out so the whole list leaves the same way a single card does
    [...this.uncheckedItems, ...this.checkedItems].forEach(item => this.removingIds.add(item.id));
    this.cdr.markForCheck();

    setTimeout(async () => {
      try {
        await this.shoppingService.clearList();
        this.toastService.success('Liste terminée !');
      } catch (error) {
        console.error('Error clearing list:', error);
        this.toastService.error('Erreur lors de la suppression de la liste');
      } finally {
        this.removingIds.clear();
        this.clearing = false;
        this.cdr.markForCheck();
      }
    }, 280);
  }
}
