import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmark, chevronBack, chevronForward } from 'ionicons/icons';
import { Subscription, distinctUntilChanged } from 'rxjs';
import { TaskService } from '../../../services/task.service';
import { ShoppingListService } from '../../../services/shopping-list.service';
import { CalendarService } from '../../../services/calendar.service';
import { DAY_LETTERS, MONTH_NAMES_FR, getMonday, toIsoDate } from '../../../utils/date.utils';

export type HomeWidgetType = 'tasks' | 'shopping' | 'calendar';

/** Single source of truth for the widget headings, shared by the home page and the picker. */
export const WIDGET_TITLES: Record<HomeWidgetType, string> = {
  tasks: 'Tâches du jour',
  shopping: 'Liste de courses',
  calendar: 'Mon calendrier',
};

const EMPTY_LABELS: Record<HomeWidgetType, string> = {
  tasks: "Aucune tâche pour aujourd'hui",
  shopping: 'Aucun produit dans la liste',
  calendar: 'Aucun événement à venir',
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
  hasEvents: boolean;
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
  host: { '[class.preview]': 'preview' },
  template: `
    @if (type === 'calendar') {
      <div class="widget-card calendar-widget-card">
        <div class="calendar-widget-nav">
          <button class="calendar-widget-nav-btn" (click)="previousWeek($event)" aria-label="Semaine précédente">
            <ion-icon name="chevron-back"></ion-icon>
          </button>
          <span class="calendar-widget-month">{{ monthLabel }}</span>
          <button class="calendar-widget-nav-btn" (click)="nextWeek($event)" aria-label="Semaine suivante">
            <ion-icon name="chevron-forward"></ion-icon>
          </button>
        </div>

        <div class="calendar-widget-week">
          @for (day of weekDays; track day.iso) {
            <div class="calendar-widget-day" [class.today]="day.isToday">
              <span class="calendar-widget-day-letter">{{ day.dayLetter }}</span>
              <span class="calendar-widget-day-number">{{ day.dayNumber }}</span>
              <span class="calendar-widget-day-dot" [class.visible]="day.hasEvents"></span>
            </div>
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
      <div class="widget-card widget-empty">
        <p class="text-sm text-gray-500">{{ emptyLabel }}</p>
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

    /* The press effect is driven by the .widget wrapper on the home page. */
    :host-context(.widget:active) .widget-card {
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

    .widget-empty {
      text-align: center;
      padding: 24px 16px;

      p {
        margin: 0;
      }
    }

    /* Mini week-calendar widget */
    .calendar-widget-card {
      padding: 14px 10px;
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
      border-radius: 12px;

      &.today {
        background: linear-gradient(145deg, var(--tile-icon-light), var(--tile-icon));

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

    .calendar-widget-day-dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: transparent;

      &.visible {
        background: var(--ion-color-danger);
      }
    }
  `]
})
export class HomeWidgetCardComponent implements OnInit, OnDestroy {
  @Input({ required: true }) type!: HomeWidgetType;
  /** Sample mode for the "add a widget" picker: fixed content, nothing interactive. */
  @Input({ transform: booleanAttribute }) preview = false;

  rows: WidgetRow[] = [];
  weekDays: MiniDayCell[] = [];
  monthLabel = '';

  private subscription?: Subscription;
  private weekStart: Date = getMonday(new Date());

  constructor(
    private taskService: TaskService,
    private shoppingService: ShoppingListService,
    private calendarService: CalendarService,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ checkmark, chevronBack, chevronForward });
  }

  get emptyLabel(): string {
    return EMPTY_LABELS[this.type];
  }

  ngOnInit() {
    if (this.preview) {
      if (this.type === 'calendar') {
        this.buildWeek();
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
        hasEvents: this.calendarService.getEventsForDate(iso).length > 0
      };
    });

    this.monthLabel = `${MONTH_NAMES_FR[this.weekStart.getMonth()]} ${this.weekStart.getFullYear()}`;
  }
}
