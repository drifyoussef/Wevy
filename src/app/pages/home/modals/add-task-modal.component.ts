import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
  IonInput, IonButtons, ModalController, IonSelect, IonSelectOption
} from '@ionic/angular/standalone';
import { TaskService } from '../../../services/task.service';
import { AuthService } from '../../../services/auth.service';
import { HouseholdService } from '../../../services/household.service';
import { HouseholdMember } from '../../../models/user.model';

@Component({
  selector: 'app-add-task-modal',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
    IonInput, IonButtons, IonSelect, IonSelectOption
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Ajouter une tâche</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" color="danger" (click)="dismiss()">Annuler</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="form-field">
        <label class="field-label">Titre de la tâche</label>
        <ion-input
          #taskTitleInput
          [(ngModel)]="taskTitle"
          name="taskTitle"
          placeholder="Ex: Sortir les poubelles"
          type="text"
          fill="outline"
          class="custom-input"
        ></ion-input>
      </div>

      <div class="form-field">
        <label class="field-label">Assignée à</label>
        <ion-select
          #taskAssigneeSelect
          [(ngModel)]="assignedTo"
          name="assignedTo"
          placeholder="Sélectionnez un membre"
          fill="outline"
          class="custom-input"
        >
          @for (member of householdMembers; track member.userId) {
            <ion-select-option [value]="member.userId">
              {{ member.displayName }}
            </ion-select-option>
          }
        </ion-select>
      </div>

      <ion-button
        expand="block"
        (click)="addTask()"
        [disabled]="!taskTitle.trim() || !assignedTo"
        class="mt-6"
      >
        Ajouter la tâche
      </ion-button>
    </ion-content>
  `,
  styles: [`
    .mt-6 {
      margin-top: 24px;
    }
  `]
})
export class AddTaskModalComponent implements OnInit {
  @Input() householdMembers: HouseholdMember[] = [];
  taskTitle: string = '';
  assignedTo: string = '';

  constructor(
    private modalController: ModalController,
    private taskService: TaskService,
    private authService: AuthService,
    private householdService: HouseholdService
  ) {}

  ngOnInit() {
    this.initializeComponent();
  }

  private async initializeComponent() {
    // Si pas de members reçus via @Input, les charger
    if (!this.householdMembers || this.householdMembers.length === 0) {
      await this.loadHouseholdMembers();
    }
  }

  async loadHouseholdMembers() {
    const household = await this.householdService.getCurrentHousehold();
    if (household) {
      this.householdMembers = household.members || [];
    }
  }

  dismiss() {
    this.modalController.dismiss();
  }

  async addTask() {
    if (!this.taskTitle.trim() || !this.assignedTo) {
      console.error('Validation failed - title or assignedTo empty');
      return;
    }

    console.log('Adding task - title:', this.taskTitle, 'assignedTo:', this.assignedTo);
    
    const selectedMember = this.householdMembers.find(m => m.userId === this.assignedTo);
    const household = await this.householdService.getCurrentHousehold();

    const taskData = {
      added: true,
      task: {
        title: this.taskTitle.trim(),
        assignedTo: this.assignedTo,
        assignedToName: selectedMember?.displayName || 'Unknown',
        householdId: household?.id || 'household1'
      }
    };
    
    console.log('Modal dismissing with data:', taskData);
    await this.modalController.dismiss(taskData);
  }
}
