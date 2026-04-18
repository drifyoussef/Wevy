import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, checkmarkCircle, ellipseOutline, trash } from 'ionicons/icons';
import { ShoppingListService } from '../../services/shopping-list.service';
import { ShoppingListItem } from '../../models/shopping-list.model';
import { Subscription } from 'rxjs';
import { AddProductModalComponent } from '../home/modals/add-product-modal.component';

@Component({
  selector: 'app-shopping',
  templateUrl: './shopping.page.html',
  styleUrls: ['./shopping.page.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShoppingPage implements OnInit, OnDestroy {
  uncheckedItems: ShoppingListItem[] = [];
  checkedItems: ShoppingListItem[] = [];
  private listSubscription?: Subscription;

  // Category color mapping
  private categoryColors: { [key: string]: string } = {
    'produce': '#10B981',    // Green
    'meat': '#EF4444',       // Red
    'dairy': '#F3A537',      // Orange
    'pantry': '#8B5CF6',     // Purple
    'spices': '#D97706',     // Amber
    'other': '#6B7280'       // Gray
  };

  constructor(
    private shoppingService: ShoppingListService,
    private modalController: ModalController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ add, checkmarkCircle, ellipseOutline, trash });
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

  getAvatarColor(item: ShoppingListItem): string {
    return this.categoryColors[item.category || 'other'] || this.categoryColors['other'];
  }

  getAvatarInitial(item: ShoppingListItem): string {
    return (item.name || 'P').charAt(0).toUpperCase();
  }

  async openAddProductModal() {
    const modal = await this.modalController.create({
      component: AddProductModalComponent
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();
    
    if (data?.added) {
      // List will update via subscription
    }
  }

  async toggleItem(itemId: string) {
    try {
      await this.shoppingService.toggleItem(itemId);
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  }

  async deleteItem(itemId: string) {
    try {
      await this.shoppingService.removeItem(itemId);
    } catch (error) {
      console.error('Error removing item:', error);
    }
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
