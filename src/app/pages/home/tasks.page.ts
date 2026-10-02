import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonButtons, IonBackButton, ModalController
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { add, checkmark, checkmarkDoneOutline, close, hourglassOutline } from 'ionicons/icons';
import { TaskService } from '../../services/task.service';
import { HouseholdService } from '../../services/household.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { NotificationService } from '../../services/notification.service';
import { Task } from '../../models/task.model';
import { HouseholdMember } from '../../models/user.model';
import { Subscription } from 'rxjs';
import { AddTaskModalComponent } from './modals/add-task-modal.component';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.page.html',
  styleUrls: ['./tasks.page.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonButtons, IonBackButton
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TasksPage implements OnInit, OnDestroy {
  todayTasks: Task[] = [];
  completedTasks: Task[] = [];
  householdMembers: HouseholdMember[] = [];
  removingIds = new Set<string>();
  togglingIds = new Set<string>();
  private todayTasksSubscription?: Subscription;
  private completedTasksSubscription?: Subscription;

  constructor(
    private taskService: TaskService,
    private householdService: HouseholdService,
    private authService: AuthService,
    private toastService: ToastService,
    private notificationService: NotificationService,
    private modalController: ModalController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ add, checkmark, checkmarkDoneOutline, close, hourglassOutline });
  }

  ngOnInit() {
    this.initializeComponent();

    // Subscribe to reactive task streams - this will emit immediately with BehaviorSubject
    this.todayTasksSubscription = this.taskService.todayTasks$.subscribe(
      tasks => {
        this.todayTasks = tasks;
        this.cdr.markForCheck();
      }
    );

    this.completedTasksSubscription = this.taskService.completedTasks$.subscribe(
      tasks => {
        this.completedTasks = tasks;
        this.cdr.markForCheck();
      }
    );
  }

  private async initializeComponent() {
    await this.loadHouseholdMembers();
  }

  ngOnDestroy() {
    this.todayTasksSubscription?.unsubscribe();
    this.completedTasksSubscription?.unsubscribe();
  }

  async loadHouseholdMembers() {
    try {
      const household = await this.householdService.getCurrentHousehold();
      if (household) {
        this.householdMembers = household.members;
      }
    } catch (error) {
      console.error('Error loading household members:', error);
    }
  }

  async openNewTaskModal() {
    const modal = await this.modalController.create({
      component: AddTaskModalComponent,
      componentProps: {
        householdMembers: this.householdMembers
      },
      breakpoints: [0, 1],
      initialBreakpoint: 1,
      cssClass: 'auto-sheet'
    });

    await modal.present();

    const result = await modal.onDidDismiss();
    const data = result.data || result;

    if (data?.added && data?.task) {
      try {
        const createdTask = this.taskService.createTask(data.task);
        this.toastService.success('Tâche ajoutée !');

        const currentUser = this.authService.getCurrentUser();
        if (currentUser && createdTask.assignedTo === currentUser.id) {
          this.notificationService.notifyTaskAssigned(createdTask.title);
        }
      } catch (error) {
        console.error('Error creating task:', error);
        this.toastService.error("Impossible d'ajouter la tâche");
      }
    }
  }

  toggleTask(taskId: string) {
    if (this.togglingIds.has(taskId)) {
      return;
    }

    // TaskService.toggleTask is synchronous, so the card would be destroyed and
    // re-rendered in the other section within the same tick - the press
    // animation would never get a frame. Hold it briefly so it can play.
    this.togglingIds.add(taskId);
    this.cdr.markForCheck();

    setTimeout(() => {
      this.togglingIds.delete(taskId);
      this.taskService.toggleTask(taskId);
      this.cdr.markForCheck();
    }, 180);
  }

  deleteTask(taskId: string, event: Event) {
    // Keep the card click (toggle) from firing when the delete badge is tapped
    event.stopPropagation();

    // Slide the card out to the right (Tinder-style) before actually removing it
    this.removingIds.add(taskId);
    this.cdr.markForCheck();

    setTimeout(() => {
      this.taskService.deleteTask(taskId);
      this.removingIds.delete(taskId);
    }, 280);
  }
}
