import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonButtons, IonBackButton, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward, add, close, locationOutline, timeOutline, createOutline } from 'ionicons/icons';
import { CalendarService } from '../../services/calendar.service';
import { HouseholdService } from '../../services/household.service';
import { AuthService } from '../../services/auth.service';
import { HouseholdMember } from '../../models/user.model';
import { memberColor, memberInitial } from '../../utils/member.utils';
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
  private subscriptions = new Subscription();
  private currentUserId: string | null = null;
  private members: HouseholdMember[] = [];

  constructor(
    private calendarService: CalendarService,
    private householdService: HouseholdService,
    private authService: AuthService,
    private toastService: ToastService,
    private modalController: ModalController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ chevronBack, chevronForward, add, close, locationOutline, timeOutline, createOutline });
  }

  ngOnInit() {
    this.subscriptions.add(this.calendarService.events$.subscribe(() => {
      this.buildWeek();
      this.cdr.markForCheck();
    }));
    // Current names of the members: an event shows who added it
    this.subscriptions.add(this.householdService.currentHousehold$.subscribe(household => {
      this.members = household?.members || [];
      this.cdr.markForCheck();
    }));
    this.subscriptions.add(this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id || null;
      this.cdr.markForCheck();
    }));
    this.buildWeek();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  /** Current name of the member who added the event (their name at the time if they left since). */
  authorName(event: CalendarEvent): string | null {
    if (!event.createdBy) return null;
    return this.members.find(m => m.userId === event.createdBy)?.displayName || event.createdByName || null;
  }

  isMine(event: CalendarEvent): boolean {
    return Boolean(event.createdBy) && event.createdBy === this.currentUserId;
  }

  authorColor(event: CalendarEvent): string {
    return memberColor(this.authorName(event));
  }

  authorInitial(event: CalendarEvent): string {
    return memberInitial(this.authorName(event));
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
      breakpoints: [0, 1],
      initialBreakpoint: 1,
      cssClass: 'auto-sheet'
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (data?.added && data?.event) {
      try {
        await this.calendarService.createEvent({
          title: data.event.title,
          date: data.event.date,
          time: data.event.time,
          location: data.event.location,
          type: data.event.type,
          color: data.event.color
        });
        this.toastService.success('Événement ajouté !');
      } catch (error) {
        console.error('Error creating event:', error);
        this.toastService.error("Impossible d'ajouter l'événement");
      }
    }
  }

  /** Your own events open in the form to be edited; the others' events aren't editable. */
  async editEvent(event: CalendarEvent) {
    if (!this.isMine(event)) return;

    const modal = await this.modalController.create({
      component: AddEventModalComponent,
      componentProps: { event, date: event.date },
      breakpoints: [0, 1],
      initialBreakpoint: 1,
      cssClass: 'auto-sheet'
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (!data?.updated || !data?.event) return;

    try {
      const updated = await this.calendarService.updateEvent(event.id, data.event);
      // Follow the event if its date moved
      if (updated.date !== event.date) {
        const [year, month, day] = updated.date.split('-').map(Number);
        this.selectedDate = new Date(year, month - 1, day);
        this.weekStart = getMonday(this.selectedDate);
        this.buildWeek();
        this.cdr.markForCheck();
      }
      this.toastService.success('Événement modifié');
    } catch (error) {
      console.error('Error updating event:', error);
      this.toastService.error((error as Error).message || "Impossible de modifier l'événement");
    }
  }

  deleteEvent(eventId: string, clickEvent?: Event) {
    // The card itself opens the edit form: the delete badge must not trigger it
    clickEvent?.stopPropagation();

    this.removingIds.add(eventId);
    this.cdr.markForCheck();

    setTimeout(async () => {
      try {
        await this.calendarService.deleteEvent(eventId);
      } catch (error) {
        console.error('Error deleting event:', error);
        this.toastService.error("Impossible de supprimer l'événement");
      } finally {
        this.removingIds.delete(eventId);
        this.cdr.markForCheck();
      }
    }, 280);
  }
}
