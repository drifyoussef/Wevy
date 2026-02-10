import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, checkmarkCircle, ellipseOutline } from 'ionicons/icons';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.page.html',
  styleUrls: ['./tasks.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon
  ]
})
export class TasksPage implements OnInit, OnDestroy {
  todayTasks: Task[] = [];
  completedTasks: Task[] = [];
  private todayTasksSubscription?: Subscription;
  private completedTasksSubscription?: Subscription;

  constructor(private taskService: TaskService) {
    addIcons({ add, checkmarkCircle, ellipseOutline });
  }

  ngOnInit() {
    // Subscribe to reactive task streams
    this.todayTasksSubscription = this.taskService.todayTasks$.subscribe(
      tasks => this.todayTasks = tasks
    );
    
    this.completedTasksSubscription = this.taskService.completedTasks$.subscribe(
      tasks => this.completedTasks = tasks
    );
  }

  ngOnDestroy() {
    this.todayTasksSubscription?.unsubscribe();
    this.completedTasksSubscription?.unsubscribe();
  }

  toggleTask(taskId: string) {
    this.taskService.toggleTask(taskId);
  }

  getAvatarColor(name: string): string {
    const colors = ['#FFB088', '#FF8B94', '#FFC75F', '#A8D5BA', '#F9AF9F'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }
}
