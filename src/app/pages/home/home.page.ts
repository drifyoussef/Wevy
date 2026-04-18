import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, checkmarkCircle } from 'ionicons/icons';
import { TaskService } from '../../services/task.service';
import { ShoppingListService } from '../../services/shopping-list.service';
import { Task } from '../../models/task.model';
import { ShoppingListItem } from '../../models/shopping-list.model';
import { Subscription, distinctUntilChanged } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { AddTaskModalComponent } from './modals/add-task-modal.component';
import { AddProductModalComponent } from './modals/add-product-modal.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonIcon
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePage implements OnInit, OnDestroy {
  todayTasks: Task[] = [];
  shoppingItems: ShoppingListItem[] = [];
  private tasksSubscription?: Subscription;
  private shoppingSubscription?: Subscription;
  displayName: string = '';
  
  constructor(
    private taskService: TaskService,
    private shoppingService: ShoppingListService,
    private router: Router,
    private authService: AuthService,
    private modalController: ModalController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ add, checkmarkCircle });
  }

  async ngOnInit() {
    // Subscribe to shopping list updates FIRST with distinctUntilChanged to prevent duplicate emissions
    this.shoppingSubscription = this.shoppingService.currentList$
      .pipe(
        distinctUntilChanged((prev, curr) => 
          JSON.stringify(prev?.items) === JSON.stringify(curr?.items)
        )
      )
      .subscribe(() => {
        this.loadShoppingItems();
        this.cdr.markForCheck();
      });
    
    // Subscribe to tasks for reactive updates
    this.tasksSubscription = this.taskService.tasks$.subscribe(() => {
      this.loadTasks();
      this.cdr.markForCheck();
    });
    
    // Load data - shopping items will be loaded via subscription
    await this.loadData();
    this.displayName = await this.authService.getDisplayName();
  }

  ngOnDestroy() {
    this.tasksSubscription?.unsubscribe();
    this.shoppingSubscription?.unsubscribe();
  }

  loadTasks() {
    // Get all today's tasks (both completed and not completed)
    const uncompletedTasks = this.taskService.getTodayTasks();
    const completedTasks = this.taskService.getCompletedTasks();
    // Combine and limit to 2 most recent
    this.todayTasks = [...uncompletedTasks, ...completedTasks].slice(0, 2);
  }

  async loadData() {
    this.loadTasks();
    // Shopping items are loaded via subscription to currentList$
  }

  loadShoppingItems() {
    const shoppingList = this.shoppingService.getCurrentListSnapshot();
    // Only show unchecked items - slice to ensure new array instance
    const filteredItems = (shoppingList?.items || []).filter(item => !item.isChecked).slice(0, 3);
    // Only update if items actually changed to prevent NG0100 errors
    if (JSON.stringify(this.shoppingItems) !== JSON.stringify(filteredItems)) {
      this.shoppingItems = filteredItems;
    }
  }

  async openAddTask() {
    const modal = await this.modalController.create({
      component: AddTaskModalComponent,
      breakpoints: [0, 0.5, 0.75],
      initialBreakpoint: 0.5,
      cssClass: 'auto-height-modal'
    });

    await modal.present();

    // La souscription à tasks$ gérera la mise à jour automatiquement
    await modal.onDidDismiss();
  }

  async openAddProduct() {
    const modal = await this.modalController.create({
      component: AddProductModalComponent,
      breakpoints: [0, 0.5, 0.75],
      initialBreakpoint: 0.5,
      cssClass: 'auto-height-modal'
    });

    await modal.present();

    // La souscription à getCurrentList() gérera la mise à jour automatiquement
    await modal.onDidDismiss();
  }

  openAddRecipe() {
    this.router.navigate(['/tabs/add-recipe']);
  }
}
