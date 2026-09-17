import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonInput,
  IonButtons, IonBackButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, close } from 'ionicons/icons';
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
  private listSubscription?: Subscription;

  constructor(
    private shoppingService: ShoppingListService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ add, close });
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

  deleteItem(itemId: string) {
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

  async clearList() {
    if (confirm('Êtes-vous sûr de vouloir vider la liste de course?')) {
      try {
        await this.shoppingService.clearList();
      } catch (error) {
        console.error('Error clearing list:', error);
      }
    }
  }
}
