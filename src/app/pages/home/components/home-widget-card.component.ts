import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, HostBinding, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cartOutline, checkmark, checkmarkDoneOutline, chevronBack, chevronForward, locationOutline, timeOutline } from 'ionicons/icons';
import { Subscription, distinctUntilChanged } from 'rxjs';
import { TaskService } from '../../../services/task.service';
import { ShoppingListService } from '../../../services/shopping-list.service';
import { CalendarService } from '../../../services/calendar.service';
import { DAY_LETTERS, MONTH_NAMES_FR, getMonday, toIsoDate } from '../../../utils/date.utils';
import { CalendarEvent, EVENT_TYPES } from '../../../models/calendar-event.model';
import { AuthService } from '../../../services/auth.service';
import { memberColor, memberInitial } from '../../../utils/member.utils';

export type HomeWidgetType = 'tasks' | 'shopping' | 'calendar';

/** Single source of truth for the widget headings, shared by the home page and the picker. */
export const WIDGET_TITLES: Record<HomeWidgetType, string> = {
  tasks: 'Tâches du jour',
  shopping: 'Liste de courses',
  calendar: 'Mon calendrier',
};

const EMPTY_STATES: Record<'tasks' | 'shopping', { icon: string; label: string }> = {
  tasks: { icon: 'checkmark-done-outline', label: "Aucune tâche pour aujourd'hui" },
  shopping: { icon: 'cart-outline', label: 'Aucun produit dans la liste' },
};

const MAX_ROWS = 3;

/**
 * Illustrative rows for the "add a widget" picker: it is a sample, not live data,
 * so it always shows both states side by side.
 */
const PREVIEW_ROWS: Record<'tasks' | 'shopping', WidgetRow[]> = {
  tasks: [
    { id: 'preview-1', label: 'Sortir les poubelles', done: false },
    { id: 'preview-2', label: 'Faire la vaisselle', done: true },
  ],
  shopping: [
    { id: 'preview-1', label: 'Lait', done: false },
    { id: 'preview-2', label: 'Pain', done: true },
  ],
};

/** Sample appointment for the picker, same idea as PREVIEW_ROWS. */
const PREVIEW_EVENTS: AgendaEvent[] = [
  { id: 'preview-1', title: 'Dentiste', time: '14:30', location: 'Cabinet du centre', color: '#3B82F6', type: 'rendezvous', createdByName: 'Léa' },
];

type AgendaEvent = Pick<CalendarEvent, 'id' | 'title' | 'time' | 'location' | 'color' | 'type' | 'createdBy' | 'createdByName'>;

interface WidgetRow {
  id: string;
  label: string;
  done: boolean;
}

interface MiniDayCell {
  iso: string;
  dayLetter: string;
  dayNumber: number;
  isToday: boolean;
  eventColors: string[];
}

/**
 * The body of a home widget. Used both on the home page and in the "add a widget"
 * picker, so the preview is the real widget rather than a look-alike.
 */
@Component({
  selector: 'app-home-widget-card',
  standalone: true,
  imports: [CommonModule, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (type === 'calendar') {
      <div class="widget-card calendar-widget-card">
        <div class="calendar-widget-top">
          <div class="calendar-widget-nav">
            <button class="calendar-widget-nav-btn" (click)="previousWeek($event)" (keyup.enter)="$event.stopPropagation()" aria-label="Semaine précédente">
              <ion-icon name="chevron-back"></ion-icon>
            </button>
            <span class="calendar-widget-month">{{ monthLabel }}</span>
            <button class="calendar-widget-nav-btn" (click)="nextWeek($event)" (keyup.enter)="$event.stopPropagation()" aria-label="Semaine suivante">
              <ion-icon name="chevron-forward"></ion-icon>
            </button>
          </div>

          <div class="calendar-widget-week">
            @for (day of weekDays; track day.iso) {
              <button
                class="calendar-widget-day"
                [class.today]="day.isToday"
                [class.selected]="day.iso === selectedIso"
                (click)="selectDay(day.iso, $event)"
                (keyup.enter)="$event.stopPropagation()"
                [attr.aria-label]="'Voir le ' + day.dayNumber"
              >
                <span class="calendar-widget-day-letter">{{ day.dayLetter }}</span>
                <span class="calendar-widget-day-number">{{ day.dayNumber }}</span>
                <span class="calendar-widget-day-dots">
                  @for (color of day.eventColors; track $index) {
                    <span class="calendar-widget-day-dot" [style.background]="color"></span>
                  }
                </span>
              </button>
            }
          </div>
        </div>

        <div class="calendar-widget-agenda">
          <span class="calendar-widget-date">{{ selectedDateLabel }}</span>

          @for (event of dayEvents; track event.id) {
            <div class="event-row">
              <span class="event-bar" [style.background]="event.color"></span>
              <div class="event-info">
                <div class="event-title-row">
                  <span class="event-title">{{ event.title }}</span>
                  <span class="event-time">{{ event.time || 'Journée' }}</span>
                </div>
                @if (event.location) {
                  <span class="event-location">
                    <ion-icon name="location-outline"></ion-icon>
                    <span>{{ event.location }}</span>
                  </span>
                }
                <span class="event-type-chip" [style.background]="event.color">{{ typeLabel(event.type) }}</span>
              </div>
              @if (event.createdByName) {
                <span
                  class="event-author-avatar"
                  [style.background]="authorColor(event)"
                  [attr.aria-label]="'Ajouté par ' + (isMine(event) ? 'vous' : event.createdByName)"
                  [attr.title]="'Ajouté par ' + (isMine(event) ? 'vous' : event.createdByName)"
                >{{ authorInitial(event) }}</span>
              }
            </div>
          } @empty {
            <div class="empty-state">
              <ion-icon name="time-outline"></ion-icon>
              <span>Aucun événement ce jour</span>
            </div>
          }

          @if (hiddenEventsCount > 0) {
            <span class="event-more">+ {{ hiddenEventsCount }} autre{{ hiddenEventsCount > 1 ? 's' : '' }}</span>
          }
        </div>
      </div>
    } @else if (rows.length > 0) {
      <div class="widget-rows">
        @for (row of rows; track row.id) {
          <div class="widget-card widget-row" [class.done]="row.done">
            <span class="widget-dot" [class.filled]="row.done">
              @if (row.done) {
                <ion-icon name="checkmark"></ion-icon>
              }
            </span>
            <span class="widget-row-label">{{ row.label }}</span>
          </div>
        }
      </div>
    } @else {
      <div class="empty-state">
        <ion-icon [name]="emptyState.icon"></ion-icon>
        <span>{{ emptyState.label }}</span>
      </div>
    }
  `,
  styles: [`
    .widget-card {
      background: #FFFFFF;
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-base);
      overflow: hidden;
      padding: 16px;
      transition: transform 0.15s ease;
    }

    /* The press effect is driven by the .widget wrapper on the home page - but not when
       the press is on an inner control (day, week arrows), which doesn't navigate. */
    :host-context(.widget:active) .widget-card:not(:has(button:active)) {
      transform: scale(0.98);
    }

    /* In the picker the card is a sample, not a control. */
    :host(.preview) {
      pointer-events: none;
    }

    .widget-rows {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .widget-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      font-size: var(--text-base);
      color: var(--ion-text-color);
    }

    .widget-row-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .widget-row.done .widget-row-label {
      text-decoration: line-through;
      color: var(--ion-color-medium);
    }

    .widget-dot {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid var(--tile-icon);
      background: transparent;
      color: #FFFFFF;
      flex-shrink: 0;

      ion-icon {
        font-size: 13px;
      }

      &.filled {
        background: var(--tile-icon);
      }
    }

    /* Mini week-calendar widget: week strip on top, selected day's agenda below */
    .calendar-widget-card {
      padding: 0;
    }

    .calendar-widget-top {
      padding: 14px 10px 0px;
    }

    .calendar-widget-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      margin-bottom: 12px;
    }

    .calendar-widget-nav-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border: none;
      border-radius: 50%;
      background: var(--ion-color-muted);
      color: var(--tile-icon);
      cursor: pointer;

      ion-icon {
        font-size: 14px;
      }

      &:active {
        transform: scale(0.92);
      }
    }

    .calendar-widget-month {
      font-size: var(--text-sm);
      font-weight: 700;
      text-transform: capitalize;
      min-width: 120px;
      text-align: center;
    }

    .calendar-widget-week {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
    }

    .calendar-widget-day {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      padding: 6px 0;
      border: none;
      border-radius: 12px;
      background: transparent;
      font: inherit;
      cursor: pointer;
      transition: background 0.15s ease, transform 0.15s ease;

      &:active {
        transform: scale(0.94);
      }

      &.today {
        box-shadow: 0 0 0 2px var(--tile-icon) inset;
      }

      &.selected {
        background: linear-gradient(145deg, var(--tile-icon-light), var(--tile-icon));
        box-shadow: none;

        .calendar-widget-day-letter,
        .calendar-widget-day-number {
          color: #FFFFFF;
        }
      }
    }

    .calendar-widget-day-letter {
      font-size: 10px;
      font-weight: 600;
      color: var(--ion-color-medium);
      text-transform: uppercase;
    }

    .calendar-widget-day-number {
      font-size: var(--text-sm);
      font-weight: 700;
      color: var(--ion-text-color);
    }

    .calendar-widget-day-dots {
      display: flex;
      gap: 2px;
      height: 4px;
    }

    .calendar-widget-day-dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
    }

    .calendar-widget-agenda {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 8px 14px 14px;
    }

    .calendar-widget-date {
      font-size: var(--text-sm);
      font-weight: 700;
      color: var(--ion-text-color);
      text-transform: capitalize;
    }

    .event-row {
      display: flex;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 12px;
      background: var(--ion-color-light);
    }

    .event-bar {
      align-self: stretch;
      width: 4px;
      border-radius: var(--radius-full);
      flex-shrink: 0;
    }

    .event-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .event-title-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      min-width: 0;
    }

    .event-title {
      font-size: var(--text-sm);
      font-weight: 600;
      color: var(--ion-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .event-time {
      font-size: 12px;
      font-weight: 600;
      color: var(--ion-color-medium-shade);
      flex-shrink: 0;
    }

    .event-location {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 12px;
      color: var(--ion-color-medium-shade);
      min-width: 0;

      span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      ion-icon {
        font-size: 12px;
        flex-shrink: 0;
      }
    }

    .event-author-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      align-self: flex-start;
      width: 22px;
      height: 22px;
      flex-shrink: 0;
      border-radius: 50%;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 700;
    }

    .event-type-chip {
      align-self: flex-start;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 700;
    }

    .event-more {
      font-size: 12px;
      color: var(--ion-color-medium-shade);
    }
  `]
})
export class HomeWidgetCardComponent implements OnInit, OnDestroy {
  @Input({ required: true }) type!: HomeWidgetType;
  /** Sample mode for the "add a widget" picker: fixed content, nothing interactive. */
  @HostBinding('class.preview')
  @Input({ transform: booleanAttribute }) preview = false;

  rows: WidgetRow[] = [];
  weekDays: MiniDayCell[] = [];
  monthLabel = '';
  selectedIso = toIsoDate(new Date());
  selectedDateLabel = '';
  dayEvents: AgendaEvent[] = [];
  hiddenEventsCount = 0;

  private subscription?: Subscription;
  private weekStart: Date = getMonday(new Date());

  constructor(
    private taskService: TaskService,
    private shoppingService: ShoppingListService,
    private calendarService: CalendarService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ cartOutline, checkmark, checkmarkDoneOutline, chevronBack, chevronForward, locationOutline, timeOutline });
  }

  get emptyState(): { icon: string; label: string } {
    return EMPTY_STATES[this.type === 'shopping' ? 'shopping' : 'tasks'];
  }

  ngOnInit() {
    if (this.preview) {
      if (this.type === 'calendar') {
        this.buildWeek();
        this.selectedDateLabel = this.formatDate(this.selectedIso);
        this.dayEvents = PREVIEW_EVENTS;
      } else {
        this.rows = PREVIEW_ROWS[this.type];
      }
      return;
    }

    switch (this.type) {
      case 'tasks':
        this.subscription = this.taskService.tasks$.subscribe(() => {
          this.rows = this.taskService.getTodayTasks()
            .slice(0, MAX_ROWS)
            .map(task => ({ id: task.id, label: task.title, done: false }));
          this.cdr.markForCheck();
        });
        break;

      case 'shopping':
        this.subscription = this.shoppingService.currentList$
          .pipe(
            distinctUntilChanged((prev, curr) =>
              JSON.stringify(prev?.items) === JSON.stringify(curr?.items)
            )
          )
          .subscribe(list => {
            this.rows = (list?.items || [])
              .filter(item => !item.isChecked)
              .slice(0, MAX_ROWS)
              .map(item => ({ id: item.id, label: item.name, done: false }));
            this.cdr.markForCheck();
          });
        break;

      case 'calendar':
        this.subscription = this.calendarService.events$.subscribe(() => {
          this.buildWeek();
          this.loadDayEvents();
          this.cdr.markForCheck();
        });
        break;
    }
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  previousWeek(event: Event) {
    event.stopPropagation();
    this.shiftWeek(-7);
  }

  nextWeek(event: Event) {
    event.stopPropagation();
    this.shiftWeek(7);
  }

  private shiftWeek(days: number) {
    const next = new Date(this.weekStart);
    next.setDate(next.getDate() + days);
    this.weekStart = next;
    this.buildWeek();
  }

  /** Picks a day inside the widget - it must not bubble up to the widget's "open the calendar" click. */
  selectDay(iso: string, event: Event) {
    event.stopPropagation();
    if (this.preview) {
      return;
    }

    this.selectedIso = iso;
    this.loadDayEvents();
  }

  isMine(event: AgendaEvent): boolean {
    return Boolean(event.createdBy) && event.createdBy === this.authService.getCurrentUser()?.id;
  }

  authorColor(event: AgendaEvent): string {
    return memberColor(event.createdByName);
  }

  authorInitial(event: AgendaEvent): string {
    return memberInitial(event.createdByName);
  }

  typeLabel(type: AgendaEvent['type']): string {
    return EVENT_TYPES.find(option => option.value === type)?.label ?? '';
  }

  private loadDayEvents() {
    // All-day events first, then by start time
    const events = [...this.calendarService.getEventsForDate(this.selectedIso)]
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    this.selectedDateLabel = this.formatDate(this.selectedIso);
    this.dayEvents = events.slice(0, MAX_ROWS);
    this.hiddenEventsCount = Math.max(0, events.length - MAX_ROWS);
  }

  private formatDate(iso: string): string {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }

  private buildWeek() {
    const todayIso = toIsoDate(new Date());

    this.weekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(this.weekStart);
      date.setDate(date.getDate() + i);
      const iso = toIsoDate(date);

      return {
        iso,
        dayLetter: DAY_LETTERS[i],
        dayNumber: date.getDate(),
        isToday: iso === todayIso,
        eventColors: this.calendarService.getEventsForDate(iso).slice(0, 3).map(event => event.color)
      };
    });

    this.monthLabel = `${MONTH_NAMES_FR[this.weekStart.getMonth()]} ${this.weekStart.getFullYear()}`;
  }
}
