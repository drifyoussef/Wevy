import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonButton, IonIcon, IonButtons, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close, add } from 'ionicons/icons';
import { HomeWidgetCardComponent, HomeWidgetType, WIDGET_TITLES } from '../components/home-widget-card.component';

interface WidgetOption {
  type: HomeWidgetType;
  label: string;
  description: string;
}

const WIDGET_OPTIONS: WidgetOption[] = [
  { type: 'tasks', label: 'Tâches', description: 'Garde tes tâches du jour à portée de main' },
  { type: 'shopping', label: 'Courses', description: 'Accède vite à ta liste de courses' },
  { type: 'calendar', label: 'Calendrier', description: 'Affiche tes prochains événements' },
];

@Component({
  selector: 'app-add-widget-modal',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonButton, IonIcon, IonButtons, HomeWidgetCardComponent],
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

    <div class="sheet-body ion-content-scroll-host">
      <p class="hint">Clique sur le widget pour l'ajouter</p>

      @for (option of availableOptions; track option.type) {
        <div class="widget-option">
          <h3>{{ option.label }}</h3>
          <p class="description">{{ option.description }}</p>

          <div class="preview-header">
            <span>{{ widgetTitles[option.type] }}</span>
            <button class="add-btn" (click)="add(option.type)" aria-label="Ajouter">
              <ion-icon name="add"></ion-icon>
            </button>
          </div>

          <app-home-widget-card [type]="option.type" preview></app-home-widget-card>
        </div>
      } @empty {
        <p class="all-added">Tous les widgets disponibles sont déjà sur ton accueil.</p>
      }
    </div>
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

    .preview-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 600;
      margin-bottom: 12px;
    }

    .add-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: none;
      background: var(--tile-icon);
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
  readonly widgetTitles = WIDGET_TITLES;

  constructor(private modalController: ModalController) {
    addIcons({ close, add });
  }

  ngOnInit() {
    this.availableOptions = WIDGET_OPTIONS.filter(option => !this.existingWidgets.includes(option.type));
  }

  add(type: HomeWidgetType) {
    this.modalController.dismiss({ type });
  }

  dismiss() {
    this.modalController.dismiss();
  }
}
