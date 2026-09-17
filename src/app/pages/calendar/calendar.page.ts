import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonButtons, IonBackButton, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward, add, close, locationOutline } from 'ionicons/icons';
import { CalendarService } from '../../services/calendar.service';
import { HouseholdService } from '../../services/household.service';
import { ToastService } from '../../services/toast.service';
import { CalendarEvent, EventType, EVENT_TYPES } from '../../models/calendar-event.model';
import { Subscription } from 'rxjs';
import { AddEventModalComponent } from './modals/add-event-modal.component';
import { DAY_LETTERS, MONTH_NAMES_FR, getMonday, toIsoDate } from '../../utils/date.utils';

interface DayCell {
  date: Date;
  iso: string;
  dayLetter: string;
  dayNumber: number;
  isToday: boolean;
  events: CalendarEvent[];
}

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.page.html',
  styleUrls: ['./calendar.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonButtons, IonBackButton
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarPage implements OnInit, OnDestroy {
  weekDays: DayCell[] = [];
  selectedDate: Date = new Date();
  selectedDayEvents: CalendarEvent[] = [];
  monthLabel = '';
  removingIds = new Set<string>();

  private weekStart: Date = getMonday(new Date());
  private eventsSubscription?: Subscription;

  constructor(
    private calendarService: CalendarService,
    private householdService: HouseholdService,
    private toastService: ToastService,
    private modalController: ModalController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ chevronBack, chevronForward, add, close, locationOutline });
  }

  ngOnInit() {
    this.eventsSubscription = this.calendarService.events$.subscribe(() => {
      this.buildWeek();
      this.cdr.markForCheck();
    });
    this.buildWeek();
  }

  ngOnDestroy() {
    this.eventsSubscription?.unsubscribe();
  }

  private buildWeek() {
    const todayIso = toIsoDate(new Date());

    this.weekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(this.weekStart);
      date.setDate(date.getDate() + i);
      const iso = toIsoDate(date);

      return {
        date,
        iso,
        dayLetter: DAY_LETTERS[i],
        dayNumber: date.getDate(),
        isToday: iso === todayIso,
        events: this.calendarService.getEventsForDate(iso)
      };
    });

    this.monthLabel = `${MONTH_NAMES_FR[this.weekStart.getMonth()]} ${this.weekStart.getFullYear()}`;
    this.updateSelectedDayEvents();
  }

  private updateSelectedDayEvents() {
    this.selectedDayEvents = this.calendarService.getEventsForDate(toIsoDate(this.selectedDate));
  }

  selectDay(day: DayCell) {
    this.selectedDate = day.date;
    this.updateSelectedDayEvents();
  }

  isSelected(day: DayCell): boolean {
    return toIsoDate(day.date) === toIsoDate(this.selectedDate);
  }

  previousWeek() {
    this.weekStart.setDate(this.weekStart.getDate() - 7);
    this.weekStart = new Date(this.weekStart);
    this.buildWeek();
  }

  nextWeek() {
    this.weekStart.setDate(this.weekStart.getDate() + 7);
    this.weekStart = new Date(this.weekStart);
    this.buildWeek();
  }

  formattedSelectedDate(): string {
    return this.selectedDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }

  getTypeLabel(type: EventType): string {
    return EVENT_TYPES.find(t => t.value === type)?.label || 'Autre';
  }

  async openAddEventModal() {
    const iso = toIsoDate(this.selectedDate);
    const modal = await this.modalController.create({
      component: AddEventModalComponent,
      componentProps: {
        date: iso,
        formattedDate: this.formattedSelectedDate()
      },
      breakpoints: [0, 0.75, 0.95],
      initialBreakpoint: 0.75,
      cssClass: 'auto-height-modal'
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (data?.added && data?.event) {
      try {
        const household = await this.householdService.getCurrentHousehold();
        this.calendarService.createEvent({
          title: data.event.title,
          date: data.event.date,
          time: data.event.time,
          location: data.event.location,
          type: data.event.type,
          color: data.event.color,
          householdId: household?.id || 'household1'
        });
        this.toastService.success('Événement ajouté !');
      } catch (error) {
        console.error('Error creating event:', error);
        this.toastService.error("Impossible d'ajouter l'événement");
      }
    }
  }

  deleteEvent(eventId: string) {
    this.removingIds.add(eventId);
    this.cdr.markForCheck();

    setTimeout(() => {
      this.calendarService.deleteEvent(eventId);
      this.removingIds.delete(eventId);
    }, 280);
  }
}
