import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonButtons, IonButton, ModalController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkDone, cart, restaurant, sparkles, person, addCircle, calendar, airplane, settings, add, close, chevronBack, chevronForward } from 'ionicons/icons';
import { TaskService } from '../../services/task.service';
import { ShoppingListService } from '../../services/shopping-list.service';
import { CalendarService } from '../../services/calendar.service';
import { Task } from '../../models/task.model';
import { ShoppingListItem } from '../../models/shopping-list.model';
import { Subscription, distinctUntilChanged } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { SwipePage } from '../swipe/swipe.page';
import { AddWidgetModalComponent, HomeWidgetType } from './modals/add-widget-modal.component';
import { DAY_LETTERS, MONTH_NAMES_FR, getMonday, toIsoDate } from '../../utils/date.utils';

interface AppTile {
  label: string;
  icon: string;
  route?: string;
  action?: 'swipe' | 'comingSoon';
  badge?: number;
}

interface MiniDayCell {
  iso: string;
  dayLetter: string;
  dayNumber: number;
  isToday: boolean;
  hasEvents: boolean;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonButtons, IonButton
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePage implements OnInit, OnDestroy {
  private tasksSubscription?: Subscription;
  private shoppingSubscription?: Subscription;
  private calendarSubscription?: Subscription;
  displayName: string = '';
  todayLabel: string = '';

  appTiles: AppTile[] = [];
  todayTasks: Task[] = [];
  shoppingItems: ShoppingListItem[] = [];
  calendarWeekDays: MiniDayCell[] = [];
  calendarMonthLabel = '';
  homeWidgets: HomeWidgetType[] = [];

  private static readonly WIDGETS_STORAGE_KEY = 'wevy_home_widgets';
  private calendarWidgetWeekStart: Date = getMonday(new Date());

  private static readonly TILE_DEFS: Omit<AppTile, 'badge'>[] = [
    { label: 'Tâches', icon: 'checkmark-done', route: '/tabs/tasks' },
    { label: 'Courses', icon: 'cart', route: '/tabs/shopping' },
    { label: 'Recettes', icon: 'restaurant', route: '/tabs/library' },
    { label: 'Découvrir', icon: 'sparkles', action: 'swipe' },
    { label: 'Ajouter', icon: 'add-circle', route: '/tabs/add-recipe' },
    { label: 'Calendrier', icon: 'calendar', route: '/tabs/calendar' },
    { label: 'Voyage', icon: 'airplane', action: 'comingSoon' },
    { label: 'Profil', icon: 'person', route: '/tabs/profile' },
  ];

  constructor(
    private taskService: TaskService,
    private shoppingService: ShoppingListService,
    private calendarService: CalendarService,
    private router: Router,
    private authService: AuthService,
    private modalController: ModalController,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ checkmarkDone, cart, restaurant, sparkles, person, addCircle, calendar, airplane, settings, add, close, chevronBack, chevronForward });
    this.appTiles = HomePage.TILE_DEFS.map(tile => ({ ...tile }));
    this.todayLabel = this.formatToday();
    this.homeWidgets = this.loadHomeWidgets();
  }

  private loadHomeWidgets(): HomeWidgetType[] {
    try {
      const raw = localStorage.getItem(HomePage.WIDGETS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveHomeWidgets() {
    localStorage.setItem(HomePage.WIDGETS_STORAGE_KEY, JSON.stringify(this.homeWidgets));
  }

  private formatToday(): string {
    const formatted = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  async ngOnInit() {
    this.shoppingSubscription = this.shoppingService.currentList$
      .pipe(
        distinctUntilChanged((prev, curr) =>
          JSON.stringify(prev?.items) === JSON.stringify(curr?.items)
        )
      )
      .subscribe(() => {
        this.updateShoppingBadge();
        this.cdr.markForCheck();
      });

    this.tasksSubscription = this.taskService.tasks$.subscribe(() => {
      this.updateTasksBadge();
      this.cdr.markForCheck();
    });

    this.calendarSubscription = this.calendarService.events$.subscribe(() => {
      this.buildCalendarWidgetWeek();
      this.updateCalendarBadge();
      this.cdr.markForCheck();
    });

    this.updateTasksBadge();
    this.updateShoppingBadge();
    this.buildCalendarWidgetWeek();
    this.updateCalendarBadge();
    this.displayName = await this.authService.getDisplayName();
  }

  ngOnDestroy() {
    this.tasksSubscription?.unsubscribe();
    this.shoppingSubscription?.unsubscribe();
    this.calendarSubscription?.unsubscribe();
  }

  private updateTasksBadge() {
    const uncompletedTasks = this.taskService.getTodayTasks();
    this.todayTasks = uncompletedTasks.slice(0, 3);
    this.setTileBadge('Tâches', uncompletedTasks.length);
  }

  private updateShoppingBadge() {
    const shoppingList = this.shoppingService.getCurrentListSnapshot();
    const uncheckedItems = (shoppingList?.items || []).filter(item => !item.isChecked);
    this.shoppingItems = uncheckedItems.slice(0, 3);
    this.setTileBadge('Courses', uncheckedItems.length);
  }

  private buildCalendarWidgetWeek() {
    const todayIso = toIsoDate(new Date());

    this.calendarWeekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(this.calendarWidgetWeekStart);
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

    this.calendarMonthLabel = `${MONTH_NAMES_FR[this.calendarWidgetWeekStart.getMonth()]} ${this.calendarWidgetWeekStart.getFullYear()}`;
  }

  calendarWidgetPreviousWeek(event: Event) {
    event.stopPropagation();
    this.calendarWidgetWeekStart.setDate(this.calendarWidgetWeekStart.getDate() - 7);
    this.calendarWidgetWeekStart = new Date(this.calendarWidgetWeekStart);
    this.buildCalendarWidgetWeek();
  }

  calendarWidgetNextWeek(event: Event) {
    event.stopPropagation();
    this.calendarWidgetWeekStart.setDate(this.calendarWidgetWeekStart.getDate() + 7);
    this.calendarWidgetWeekStart = new Date(this.calendarWidgetWeekStart);
    this.buildCalendarWidgetWeek();
  }

  private updateCalendarBadge() {
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = this.calendarService.getEvents().filter(event => event.date.startsWith(monthPrefix)).length;
    this.setTileBadge('Calendrier', count);
  }

  private setTileBadge(label: string, count: number) {
    const tile = this.appTiles.find(t => t.label === label);
    if (tile) {
      tile.badge = count > 0 ? count : undefined;
      this.appTiles = [...this.appTiles];
    }
  }

  async goToTile(tile: AppTile) {
    if (tile.action === 'swipe') {
      await this.openSwipeMode();
    } else if (tile.action === 'comingSoon') {
      await this.presentComingSoon(tile.label);
    } else if (tile.route) {
      this.router.navigate([tile.route]);
    }
  }

  goTo(route: string) {
    this.router.navigate([route]);
  }

  goToSettings() {
    this.router.navigate(['/tabs/settings']);
  }

  async openAddWidgetModal() {
    const modal = await this.modalController.create({
      component: AddWidgetModalComponent,
      componentProps: { existingWidgets: this.homeWidgets },
      breakpoints: [0, 0.75, 0.95],
      initialBreakpoint: 0.75,
      cssClass: 'auto-height-modal'
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data?.type && !this.homeWidgets.includes(data.type)) {
      this.homeWidgets = [...this.homeWidgets, data.type];
      this.saveHomeWidgets();
      this.cdr.markForCheck();
    }
  }

  removeWidget(type: HomeWidgetType, event: Event) {
    event.stopPropagation();
    this.homeWidgets = this.homeWidgets.filter(w => w !== type);
    this.saveHomeWidgets();
  }

  private async openSwipeMode() {
    const modal = await this.modalController.create({
      component: SwipePage,
      cssClass: 'fullscreen-modal',
      backdropDismiss: false
    });
    await modal.present();
  }

  private async presentComingSoon(label: string) {
    const toast = await this.toastController.create({
      message: `${label} arrive bientôt !`,
      duration: 1800,
      position: 'bottom'
    });
    await toast.present();
  }
}
