import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonCheckbox
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, trashOutline } from 'ionicons/icons';
import { ShoppingListService } from '../../services/shopping-list.service';
import { ShoppingList, ShoppingListItem } from '../../models/shopping-list.model';

@Component({
  selector: 'app-shopping',
  templateUrl: './shopping.page.html',
  styleUrls: ['./shopping.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonCheckbox
  ]
})
export class ShoppingPage implements OnInit {
  shoppingList: ShoppingList | null = null;
  uncheckedItems: ShoppingListItem[] = [];

  constructor(private shoppingService: ShoppingListService) {
    addIcons({ add, trashOutline });
  }

  async ngOnInit() {
    await this.loadShoppingList();
  }

  async loadShoppingList() {
    try {
      // TODO: Get household ID from auth
      const householdId = 'placeholder-household-id';
      this.shoppingList = await this.shoppingService.getCurrentList(householdId);
      
      if (this.shoppingList) {
        this.uncheckedItems = this.shoppingList.items.filter(item => !item.isChecked);
      }
    } catch (error) {
      console.error('Error loading shopping list:', error);
    }
  }

  async toggleItem(itemId: string) {
    if (this.shoppingList) {
      try {
        await this.shoppingService.toggleItemChecked(this.shoppingList.id, itemId);
        await this.loadShoppingList();
      } catch (error) {
        console.error('Error toggling item:', error);
      }
    }
  }

  async deleteItem(itemId: string) {
    if (this.shoppingList) {
      try {
        await this.shoppingService.removeItem(this.shoppingList.id, itemId);
        await this.loadShoppingList();
      } catch (error) {
        console.error('Error removing item:', error);
      }
    }
  }
}
