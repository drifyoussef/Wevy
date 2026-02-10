import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, checkmarkCircle } from 'ionicons/icons';
import { TaskService } from '../../services/task.service';
import { ShoppingListService } from '../../services/shopping-list.service';
import { Task } from '../../models/task.model';
import { ShoppingListItem } from '../../models/shopping-list.model';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonIcon
  ]
})
export class HomePage implements OnInit, OnDestroy {
  todayTasks: Task[] = [];
  shoppingItems: ShoppingListItem[] = [];
  private tasksSubscription?: Subscription;
  displayName: string = '';
  constructor(
    private taskService: TaskService,
    private shoppingService: ShoppingListService,
    private router: Router,
    private authService: AuthService,
  ) {
    addIcons({ add, checkmarkCircle });
  }

  async ngOnInit() {
    // Subscribe to tasks for reactive updates
    this.tasksSubscription = this.taskService.tasks$.subscribe(() => {
      this.loadTasks();
    });
    
    await this.loadData();
    this.displayName = await this.authService.getDisplayName();
  }

  ngOnDestroy() {
    this.tasksSubscription?.unsubscribe();
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
    
    const shoppingList = await this.shoppingService.getCurrentList();
    // Only show unchecked items
    this.shoppingItems = (shoppingList?.items || []).filter(item => !item.isChecked).slice(0, 3);
  }

  openAddTask() {
    // TODO: Open add task modal
    console.log('Add task');
  }

  openAddProduct() {
    // TODO: Open add product modal
    console.log('Add product');
  }

  openAddRecipe() {
    this.router.navigate(['/tabs/add-recipe']);
  }

  getAvatarColor(name: string): string {
    const colors = ['#FFB088', '#FF8B94', '#FFC75F', '#A8D5BA', '#F9AF9F'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }
}
