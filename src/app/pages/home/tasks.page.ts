import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  ModalController
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { add, checkmarkCircle, ellipseOutline, trash, close } from 'ionicons/icons';
import { TaskService } from '../../services/task.service';
import { HouseholdService } from '../../services/household.service';
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
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TasksPage implements OnInit, OnDestroy {
  todayTasks: Task[] = [];
  completedTasks: Task[] = [];
  householdMembers: HouseholdMember[] = [];
  private todayTasksSubscription?: Subscription;
  private completedTasksSubscription?: Subscription;

  constructor(
    private taskService: TaskService,
    private householdService: HouseholdService,
    private modalController: ModalController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ add, checkmarkCircle, ellipseOutline, trash, close });
  }

  ngOnInit() {
    this.loadHouseholdMembers();
    
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
      }
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data?.added && data?.task) {
      this.taskService.createTask(data.task);
    }
  }

  toggleTask(taskId: string) {
    this.taskService.toggleTask(taskId);
  }

  deleteTask(taskId: string) {
    this.taskService.deleteTask(taskId);
  }
}
