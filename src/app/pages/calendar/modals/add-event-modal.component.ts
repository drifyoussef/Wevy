import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
  IonInput, IonButtons, IonModal, IonDatetime, IonIcon, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { timeOutline, locationOutline } from 'ionicons/icons';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, map, catchError } from 'rxjs/operators';
import { EVENT_TYPES, EventType } from '../../../models/calendar-event.model';

interface AddressFeature {
  properties: { label: string };
}

@Component({
  selector: 'app-add-event-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
    IonInput, IonButtons, IonModal, IonDatetime, IonIcon
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Nouvel événement</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" color="danger" (click)="dismiss()">Annuler</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <p class="event-date">{{ formattedDate }}</p>

      <div class="form-field">
        <label class="field-label">Titre de l'événement</label>
        <ion-input
          #eventTitleInput
          [(ngModel)]="title"
          name="title"
          placeholder="Ex: Anniversaire de Léa..."
          type="text"
          fill="outline"
          class="custom-input"
        ></ion-input>
      </div>

      <div class="form-field">
        <label class="field-label">Heure (optionnel)</label>
        <button id="open-time-picker" class="time-trigger">
          <ion-icon name="time-outline"></ion-icon>
          <span>{{ time || 'Choisir une heure' }}</span>
        </button>
      </div>

      <div class="form-field location-field">
        <label class="field-label">Lieu (optionnel)</label>
        <ion-input
          [(ngModel)]="location"
          (ionInput)="onLocationInput($event)"
          (ionBlur)="onLocationBlur()"
          (ionFocus)="onLocationFocus()"
          name="location"
          placeholder="Ex: 24 rue du Palais, Paris..."
          type="text"
          fill="outline"
          class="custom-input"
          autocomplete="off"
        ></ion-input>

        @if (showSuggestions && locationSuggestions.length > 0) {
          <div class="suggestions-list">
            @for (suggestion of locationSuggestions; track suggestion) {
              <button class="suggestion-item" (mousedown)="selectLocation(suggestion)">
                <ion-icon name="location-outline"></ion-icon>
                <span>{{ suggestion }}</span>
              </button>
            }
          </div>
        }
      </div>

      <div class="form-field">
        <label class="field-label">Type d'événement</label>
        <div class="type-chips">
          @for (option of eventTypes; track option.value) {
            <button
              class="type-chip"
              [class.selected]="selectedType === option.value"
              [style.--chip-color]="option.color"
              (click)="selectedType = option.value"
            >
              <span class="type-chip-dot" [style.background]="option.color"></span>
              {{ option.label }}
            </button>
          }
        </div>
      </div>

      <ion-button
        expand="block"
        (click)="addEvent()"
        [disabled]="!title.trim()"
        class="mt-6"
      >
        Ajouter l'événement
      </ion-button>
    </ion-content>

    <ion-modal trigger="open-time-picker" class="time-picker-modal" #timeModalRef>
      <ng-template>
        <div class="time-picker-content">
          <ion-datetime
            presentation="time"
            [value]="timeIso"
            (ionChange)="onTimeChange($event)"
            locale="fr-FR"
            color="primary"
          ></ion-datetime>
          <ion-button expand="block" (click)="timeModalRef.dismiss()">Valider</ion-button>
        </div>
      </ng-template>
    </ion-modal>
  `,
  styles: [`
    .event-date {
      color: var(--ion-color-medium);
      font-weight: 600;
      margin: 0 0 20px;
      text-transform: capitalize;
    }

    .time-trigger {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      height: 48px;
      padding: 0 16px;
      border: 2px solid var(--ion-color-primary);
      border-radius: 12px;
      background: var(--ion-color-light);
      color: var(--ion-text-color);
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      text-align: left;

      ion-icon {
        font-size: 20px;
        color: var(--ion-color-primary);
        flex-shrink: 0;
      }

      &:active {
        background: var(--ion-color-light-shade, #eef0f4);
      }
    }

    .location-field {
      position: relative;
    }

    .suggestions-list {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      z-index: 20;
      background: #FFFFFF;
      border-radius: 12px;
      box-shadow: var(--shadow-lg);
      overflow: hidden;
      max-height: 220px;
      overflow-y: auto;
    }

    .suggestion-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 10px 14px;
      border: none;
      background: transparent;
      text-align: left;
      font-size: 13px;
      color: var(--ion-text-color);
      cursor: pointer;

      & + & {
        border-top: 1px solid var(--color-gray-100);
      }

      ion-icon {
        font-size: 16px;
        color: var(--tile-icon);
        flex-shrink: 0;
      }

      &:active {
        background: var(--ion-color-light);
      }
    }

    .type-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .type-chip {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: var(--radius-full);
      border: 2px solid var(--ion-border-subtle);
      background: #FFFFFF;
      font-size: 13px;
      font-weight: 600;
      color: var(--ion-text-color);
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease;

      &.selected {
        border-color: var(--chip-color);
        background: var(--chip-color);
        color: #FFFFFF;
      }
    }

    .type-chip-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      border: 1.5px solid #FFFFFF;
    }

    .mt-6 {
      margin-top: 24px;
    }
  `]
})
export class AddEventModalComponent implements OnInit, OnDestroy {
  @Input() date: string = '';
  @Input() formattedDate: string = '';

  title = '';
  time = '';
  timeIso = new Date().toISOString();
  location = '';
  eventTypes = EVENT_TYPES;
  selectedType: EventType = EVENT_TYPES[0].value;

  locationSuggestions: string[] = [];
  showSuggestions = false;

  private locationQuery$ = new Subject<string>();
  private querySubscription?: Subscription;

  constructor(
    private modalController: ModalController,
    private http: HttpClient
  ) {
    addIcons({ timeOutline, locationOutline });
  }

  ngOnInit() {
    this.querySubscription = this.locationQuery$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(query => {
          if (!query || query.trim().length < 3) {
            return of([]);
          }
          return this.http
            .get<{ features: AddressFeature[] }>(
              `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`
            )
            .pipe(
              map(res => res.features.map(f => f.properties.label)),
              catchError(() => of([]))
            );
        })
      )
      .subscribe(suggestions => {
        this.locationSuggestions = suggestions;
      });
  }

  ngOnDestroy() {
    this.querySubscription?.unsubscribe();
  }

  onLocationInput(event: CustomEvent) {
    const value = (event.detail as { value?: string })?.value || '';
    this.location = value;
    this.locationQuery$.next(value);
  }

  onLocationFocus() {
    this.showSuggestions = true;
  }

  onLocationBlur() {
    // Slight delay so a suggestion's (mousedown) has time to fire before the list unmounts
    setTimeout(() => (this.showSuggestions = false), 150);
  }

  selectLocation(label: string) {
    this.location = label;
    this.locationSuggestions = [];
    this.showSuggestions = false;
  }

  onTimeChange(event: CustomEvent) {
    const iso = (event.detail as { value?: string })?.value;
    if (!iso) return;
    this.timeIso = iso;
    const match = iso.match(/T(\d{2}):(\d{2})/);
    if (match) {
      this.time = `${match[1]}:${match[2]}`;
    }
  }

  dismiss() {
    this.modalController.dismiss();
  }

  addEvent() {
    if (!this.title.trim()) return;

    const type = this.eventTypes.find(t => t.value === this.selectedType) || this.eventTypes[0];

    this.modalController.dismiss({
      added: true,
      event: {
        title: this.title.trim(),
        date: this.date,
        time: this.time || undefined,
        location: this.location.trim() || undefined,
        type: type.value,
        color: type.color
      }
    });
  }
}
