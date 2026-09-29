import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonIcon, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close, airplane, sunny, snow, business, bonfire, car, boat, train, checkmark } from 'ionicons/icons';
import { HouseholdMember } from '../../models/user.model';
import { TRIP_COVERS, Trip, TripCover, TripInput } from '../../models/trip.model';
import { memberColor, memberInitial } from '../../utils/member.utils';
import { toIsoDate } from '../../utils/date.utils';

/** Create a trip, or edit one when `trip` is given. Dismisses with `{ trip: TripInput }`. */
@Component({
  selector: 'app-trip-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonIcon],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>{{ trip ? 'Modifier le voyage' : 'Nouveau voyage' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" (click)="dismiss()" aria-label="Fermer">
            <ion-icon slot="icon-only" name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <section class="form-group">
        <h3 class="form-group-title">Voyage</h3>
        <input class="form-input" type="text" [(ngModel)]="name" placeholder="Ex : Vacances d'été" maxlength="80" aria-label="Nom du voyage" />
        <input class="form-input" type="text" [(ngModel)]="destination" placeholder="Destination (Lisbonne, Alpes...)" maxlength="120" aria-label="Destination" />
      </section>

      <section class="form-group">
        <h3 class="form-group-title">Dates</h3>
        <div class="date-row">
          <label class="date-field">
            <span>Départ</span>
            <input type="date" [(ngModel)]="startDate" (ngModelChange)="onStartChange()" />
          </label>
          <label class="date-field">
            <span>Retour</span>
            <input type="date" [(ngModel)]="endDate" [min]="startDate" />
          </label>
        </div>
      </section>

      <section class="form-group">
        <h3 class="form-group-title">Ambiance</h3>
        <div class="covers">
          @for (option of covers; track option.value) {
            <button
              class="cover"
              [class.selected]="cover === option.value"
              [style.background]="'linear-gradient(145deg, ' + option.gradient[0] + ', ' + option.gradient[1] + ')'"
              (click)="cover = option.value"
              [attr.aria-label]="option.label"
              [attr.aria-pressed]="cover === option.value"
            >
              <ion-icon [name]="option.value"></ion-icon>
              @if (cover === option.value) {
                <span class="cover-check"><ion-icon name="checkmark"></ion-icon></span>
              }
            </button>
          }
        </div>
      </section>

      @if (members.length > 1) {
        <section class="form-group">
          <h3 class="form-group-title">Qui part ?</h3>
          <div class="chips">
            @for (member of members; track member.userId) {
              <button class="chip" [class.selected]="participants.has(member.userId)" (click)="toggleParticipant(member.userId)">
                <span class="chip-avatar" [style.background]="color(member.displayName)">{{ initial(member.displayName) }}</span>
                {{ member.displayName }}
              </button>
            }
          </div>
        </section>
      }

      <section class="form-group">
        <h3 class="form-group-title">Notes</h3>
        <textarea class="form-input form-textarea" rows="3" [(ngModel)]="notes" placeholder="Réservations, adresse du logement, idées..." maxlength="3000" aria-label="Notes"></textarea>
      </section>

      @if (error) {
        <p class="form-error">{{ error }}</p>
      }

      <button class="primary-btn" (click)="save()">{{ trip ? 'Enregistrer' : 'Créer le voyage' }}</button>
    </ion-content>
  `,
  styles: [`
    .form-group { margin-bottom: 22px; }

    .form-group-title {
      margin: 0 0 10px 2px;
      font-size: var(--text-sm);
      font-weight: 700;
      color: var(--ion-color-dark-tint);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .form-input {
      width: 100%;
      height: 50px;
      padding: 0 16px;
      border: 1px solid var(--ion-border-color);
      border-radius: 14px;
      background: #FFFFFF;
      outline: none;
      font: inherit;
      font-size: var(--text-base);
      color: var(--ion-text-color);
    }

    .form-input + .form-input { margin-top: 10px; }
    .form-input:focus { border-color: var(--tile-icon); }

    .form-textarea {
      height: auto;
      padding: 12px 16px;
      line-height: 1.45;
      resize: vertical;
    }

    .date-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .date-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 10px 14px;
      border: 1px solid var(--ion-border-color);
      border-radius: 14px;
      background: #FFFFFF;
    }

    .date-field span {
      font-size: 12px;
      font-weight: 600;
      color: var(--ion-color-medium-shade);
    }

    .date-field input {
      width: 100%;
      border: none;
      outline: none;
      background: transparent;
      font: inherit;
      font-size: var(--text-base);
      font-weight: 700;
      color: var(--ion-text-color);
    }

    .covers {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    .cover {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      aspect-ratio: 1;
      border: 3px solid transparent;
      border-radius: 18px;
      color: #FFFFFF;
      cursor: pointer;
    }

    .cover > ion-icon { font-size: 26px; }
    .cover.selected { border-color: var(--ion-text-color); }

    .cover-check {
      position: absolute;
      top: -6px;
      right: -6px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border: 2px solid #FFFFFF;
      border-radius: 50%;
      background: var(--ion-text-color);
    }

    .cover-check ion-icon { font-size: 12px; }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px 6px 6px;
      border: 1px solid var(--ion-border-color);
      border-radius: var(--radius-full);
      background: #FFFFFF;
      color: var(--ion-text-color);
      font: inherit;
      font-size: var(--text-sm);
      font-weight: 600;
      cursor: pointer;
      opacity: 0.6;
    }

    .chip.selected {
      border-color: var(--tile-icon);
      background: var(--tile-bg);
      opacity: 1;
    }

    .chip-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 700;
    }

    .form-error {
      margin: 0 0 14px;
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(var(--ion-color-danger-rgb), 0.1);
      color: var(--ion-color-danger);
      font-size: var(--text-sm);
    }

    .primary-btn {
      width: 100%;
      min-height: 54px;
      margin: 8px 0 24px;
      padding: 16px;
      border: none;
      border-radius: var(--radius-xl);
      background: linear-gradient(145deg, var(--tile-icon-light), var(--tile-icon));
      box-shadow: var(--shadow-base);
      color: #FFFFFF;
      font: inherit;
      font-size: var(--text-base);
      font-weight: 700;
      cursor: pointer;
    }

    .primary-btn:active { transform: scale(0.98); }
  `]
})
export class TripFormModalComponent implements OnInit {
  @Input() trip?: Trip;
  @Input() members: HouseholdMember[] = [];

  readonly covers = TRIP_COVERS;

  name = '';
  destination = '';
  startDate = '';
  endDate = '';
  cover: TripCover = 'airplane';
  participants = new Set<string>();
  notes = '';
  error = '';

  constructor(private modalController: ModalController) {
    addIcons({ close, airplane, sunny, snow, business, bonfire, car, boat, train, checkmark });
  }

  ngOnInit() {
    if (this.trip) {
      this.name = this.trip.name;
      this.destination = this.trip.destination;
      this.startDate = this.trip.startDate;
      this.endDate = this.trip.endDate;
      this.cover = this.trip.cover;
      this.participants = new Set(this.trip.participants);
      this.notes = this.trip.notes;
    } else {
      // A week starting in 7 days: a sensible starting point to adjust
      const start = new Date();
      start.setDate(start.getDate() + 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      this.startDate = toIsoDate(start);
      this.endDate = toIsoDate(end);
      this.participants = new Set(this.members.map(m => m.userId));
    }
  }

  onStartChange() {
    // Keep the return date after the departure
    if (this.endDate && this.startDate && this.endDate < this.startDate) {
      this.endDate = this.startDate;
    }
  }

  toggleParticipant(userId: string) {
    if (this.participants.has(userId)) {
      if (this.participants.size > 1) this.participants.delete(userId);
    } else {
      this.participants.add(userId);
    }
  }

  color(name: string): string {
    return memberColor(name);
  }

  initial(name: string): string {
    return memberInitial(name);
  }

  save() {
    if (!this.name.trim()) {
      this.error = 'Donne un nom à ce voyage';
      return;
    }
    if (!this.startDate || !this.endDate) {
      this.error = 'Choisis les dates du voyage';
      return;
    }
    if (this.endDate < this.startDate) {
      this.error = 'Le retour doit être après le départ';
      return;
    }

    const input: TripInput = {
      name: this.name.trim(),
      destination: this.destination.trim(),
      startDate: this.startDate,
      endDate: this.endDate,
      cover: this.cover,
      participants: [...this.participants],
      notes: this.notes.trim()
    };
    this.modalController.dismiss({ trip: input });
  }

  dismiss() {
    this.modalController.dismiss();
  }
}
