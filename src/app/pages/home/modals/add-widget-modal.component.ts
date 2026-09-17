import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonButtons, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close, add } from 'ionicons/icons';
import { TaskService } from '../../../services/task.service';
import { ShoppingListService } from '../../../services/shopping-list.service';
import { Task } from '../../../models/task.model';
import { ShoppingListItem } from '../../../models/shopping-list.model';

export type HomeWidgetType = 'tasks' | 'shopping';

interface WidgetOption {
  type: HomeWidgetType;
  label: string;
  description: string;
  previewTitle: string;
}

const WIDGET_OPTIONS: WidgetOption[] = [
  { type: 'tasks', label: 'Tâches', description: 'Garde tes tâches du jour à portée de main', previewTitle: 'Mes tâches' },
  { type: 'shopping', label: 'Courses', description: 'Accède vite à ta liste de courses', previewTitle: 'Ma liste de courses' },
];

@Component({
  selector: 'app-add-widget-modal',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonButtons],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Ajouter un widget</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" color="danger" (click)="dismiss()">
            <ion-icon slot="icon-only" name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <p class="hint">Clique sur le widget pour l'ajouter</p>

      @for (option of availableOptions; track option.type) {
        <div class="widget-option">
          <h3>{{ option.label }}</h3>
          <p class="description">{{ option.description }}</p>

          <div class="preview-card">
            <div class="preview-header">
              <span>{{ option.previewTitle }}</span>
              <button class="add-btn" (click)="add(option.type)" aria-label="Ajouter">
                <ion-icon name="add"></ion-icon>
              </button>
            </div>

            @if (option.type === 'tasks') {
              @for (task of previewTasks; track task.id) {
                <div class="preview-row">
                  <span class="dot"></span>
                  <span>{{ task.title }}</span>
                </div>
              } @empty {
                <p class="preview-empty">Aucune tâche pour aujourd'hui</p>
              }
            }

            @if (option.type === 'shopping') {
              @for (item of previewItems; track item.id) {
                <div class="preview-row">
                  <span class="dot"></span>
                  <span>{{ item.name }}</span>
                </div>
              } @empty {
                <p class="preview-empty">Liste vide</p>
              }
            }
          </div>
        </div>
      } @empty {
        <p class="all-added">Tous les widgets disponibles sont déjà sur ton accueil.</p>
      }
    </ion-content>
  `,
  styles: [`
    .hint {
      color: var(--ion-color-medium);
      font-size: 14px;
      margin: 0 0 20px;
    }

    .widget-option {
      margin-bottom: 24px;

      h3 {
        margin: 0 0 4px;
        font-size: 17px;
        font-weight: 700;
      }

      .description {
        margin: 0 0 12px;
        color: var(--ion-color-medium);
        font-size: 14px;
      }
    }

    .preview-card {
      background: #FFFFFF;
      border-radius: 16px;
      box-shadow: var(--shadow-base);
      padding: 16px;
    }

    .preview-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .add-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(145deg, var(--tile-icon-light), var(--tile-icon));
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;

      ion-icon {
        font-size: 18px;
      }

      &:active {
        transform: scale(0.92);
      }
    }

    .preview-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      font-size: 14px;

      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--tile-icon);
        flex-shrink: 0;
      }
    }

    .preview-empty {
      color: var(--ion-color-medium);
      font-size: 14px;
      margin: 4px 0;
    }

    .all-added {
      text-align: center;
      color: var(--ion-color-medium);
      margin-top: 40px;
    }
  `]
})
export class AddWidgetModalComponent implements OnInit {
  @Input() existingWidgets: HomeWidgetType[] = [];

  availableOptions: WidgetOption[] = [];
  previewTasks: Task[] = [];
  previewItems: ShoppingListItem[] = [];

  constructor(
    private modalController: ModalController,
    private taskService: TaskService,
    private shoppingService: ShoppingListService
  ) {
    addIcons({ close, add });
  }

  ngOnInit() {
    this.availableOptions = WIDGET_OPTIONS.filter(option => !this.existingWidgets.includes(option.type));
    this.previewTasks = this.taskService.getTodayTasks().slice(0, 3);
    const list = this.shoppingService.getCurrentListSnapshot();
    this.previewItems = (list?.items || []).filter(item => !item.isChecked).slice(0, 3);
  }

  add(type: HomeWidgetType) {
    this.modalController.dismiss({ type });
  }

  dismiss() {
    this.modalController.dismiss();
  }
}
