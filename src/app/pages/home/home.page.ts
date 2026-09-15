import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, ModalController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkDone, cart, restaurant, sparkles, person, addCircle, calendar, airplane } from 'ionicons/icons';
import { TaskService } from '../../services/task.service';
import { ShoppingListService } from '../../services/shopping-list.service';
import { Subscription, distinctUntilChanged } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { SwipePage } from '../swipe/swipe.page';

interface AppTile {
  label: string;
  icon: string;
  route?: string;
  action?: 'swipe' | 'comingSoon';
  badge?: number;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonIcon
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePage implements OnInit, OnDestroy {
  private tasksSubscription?: Subscription;
  private shoppingSubscription?: Subscription;
  displayName: string = '';
  todayLabel: string = '';

  appTiles: AppTile[] = [];

  private static readonly TILE_DEFS: Omit<AppTile, 'badge'>[] = [
    { label: 'Tâches', icon: 'checkmark-done', route: '/tabs/tasks' },
    { label: 'Courses', icon: 'cart', route: '/tabs/shopping' },
    { label: 'Recettes', icon: 'restaurant', route: '/tabs/library' },
    { label: 'Découvrir', icon: 'sparkles', action: 'swipe' },
    { label: 'Ajouter', icon: 'add-circle', route: '/tabs/add-recipe' },
    { label: 'Calendrier', icon: 'calendar', action: 'comingSoon' },
    { label: 'Voyage', icon: 'airplane', action: 'comingSoon' },
    { label: 'Profil', icon: 'person', route: '/tabs/profile' },
  ];

  constructor(
    private taskService: TaskService,
    private shoppingService: ShoppingListService,
    private router: Router,
    private authService: AuthService,
    private modalController: ModalController,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ checkmarkDone, cart, restaurant, sparkles, person, addCircle, calendar, airplane });
    this.appTiles = HomePage.TILE_DEFS.map(tile => ({ ...tile }));
    this.todayLabel = this.formatToday();
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

    this.updateTasksBadge();
    this.updateShoppingBadge();
    this.displayName = await this.authService.getDisplayName();
  }

  ngOnDestroy() {
    this.tasksSubscription?.unsubscribe();
    this.shoppingSubscription?.unsubscribe();
  }

  private updateTasksBadge() {
    this.setTileBadge('Tâches', this.taskService.getTodayTasks().length);
  }

  private updateShoppingBadge() {
    const shoppingList = this.shoppingService.getCurrentListSnapshot();
    const uncheckedCount = (shoppingList?.items || []).filter(item => !item.isChecked).length;
    this.setTileBadge('Courses', uncheckedCount);
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
