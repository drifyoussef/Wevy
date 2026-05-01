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
    this.initializeComponent();
    
    // Subscribe to reactive task streams - this will emit immediately with BehaviorSubject
    this.todayTasksSubscription = this.taskService.todayTasks$.subscribe(
      tasks => {
        console.log('todayTasks$ emitted:', tasks);
        this.todayTasks = tasks;
        console.log('this.todayTasks set to:', this.todayTasks);
        this.cdr.markForCheck();
      }
    );

    this.completedTasksSubscription = this.taskService.completedTasks$.subscribe(
      tasks => {
        console.log('completedTasks$ emitted:', tasks);
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
    console.log('Opening task modal, householdMembers:', this.householdMembers);
    
    const modal = await this.modalController.create({
      component: AddTaskModalComponent,
      componentProps: {
        householdMembers: this.householdMembers
      }
    });

    await modal.present();

    const result = await modal.onDidDismiss();
    console.log('Full onDidDismiss result:', result);
    console.log('result.data:', result.data);
    console.log('result.role:', result.role);
    
    // Ionic retourne {data, role} - les données peuvent être dans result directement ou dans result.data
    const data = result.data || result;
    console.log('Extracted data:', data);
    
    if (data?.added && data?.task) {
      console.log('Creating task:', data.task);
      this.taskService.createTask(data.task);
    } else {
      console.error('Invalid data received from modal. Full result:', result);
    }
  }

  toggleTask(taskId: string) {
    this.taskService.toggleTask(taskId);
  }

  deleteTask(taskId: string) {
    this.taskService.deleteTask(taskId);
  }
}
