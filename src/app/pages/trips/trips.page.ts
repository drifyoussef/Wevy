import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonBackButton, IonIcon, IonSpinner,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add, airplane, sunny, snow, business, bonfire, car, boat, train, calendarOutline, locationOutline,
  cloudOfflineOutline, refreshOutline, homeOutline, chevronForward, bagHandleOutline
} from 'ionicons/icons';
import { TripService } from '../../services/trip.service';
import { HouseholdService } from '../../services/household.service';
import { ToastService } from '../../services/toast.service';
import { Trip } from '../../models/trip.model';
import { HouseholdMember } from '../../models/user.model';
import { memberColor, memberInitial } from '../../utils/member.utils';
import { TripFormModalComponent } from './trip-form-modal.component';
import { coverGradient, formatDateRange, tripCountdown, tripStatus } from './trip.utils';

type PageState = 'loading' | 'ready' | 'error' | 'no-household';

@Component({
  selector: 'app-trips',
  templateUrl: './trips.page.html',
  styleUrls: ['./trips.page.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonBackButton, IonIcon, IonSpinner
  ]
})
export class TripsPage {
  state: PageState = 'loading';
  upcoming: Trip[] = [];
  past: Trip[] = [];
  private members: HouseholdMember[] = [];

  readonly coverGradient = coverGradient;
  readonly formatDateRange = formatDateRange;
  readonly tripCountdown = tripCountdown;

  constructor(
    private tripService: TripService,
    private householdService: HouseholdService,
    private toastService: ToastService,
    private modalController: ModalController,
    private router: Router
  ) {
    addIcons({
      add, airplane, sunny, snow, business, bonfire, car, boat, train, calendarOutline, locationOutline,
      cloudOfflineOutline, refreshOutline, homeOutline, chevronForward, bagHandleOutline
    });
  }

  /** Reloaded on every visit: trips change from their own page and from other members. */
  ionViewWillEnter() {
    this.load();
  }

  async load() {
    if (this.state !== 'ready') this.state = 'loading';
    try {
      const household = await this.householdService.getCurrentHousehold();
      if (!household) {
        this.state = this.householdService.loadState === 'error' ? 'error' : 'no-household';
        return;
      }
      this.members = household.members;

      const trips = await this.tripService.getTrips();
      // Ongoing and upcoming: soonest first. Past: most recent first.
      this.upcoming = trips.filter(t => tripStatus(t) !== 'past').sort((a, b) => a.startDate.localeCompare(b.startDate));
      this.past = trips.filter(t => tripStatus(t) === 'past').sort((a, b) => b.startDate.localeCompare(a.startDate));
      this.state = 'ready';
    } catch (error) {
      console.error('Error loading trips:', error);
      this.state = 'error';
    }
  }

  isPast(trip: Trip): boolean {
    return tripStatus(trip) === 'past';
  }

  isOngoing(trip: Trip): boolean {
    return tripStatus(trip) === 'ongoing';
  }

  packedCount(trip: Trip): number {
    return trip.packing.filter(item => item.checked).length;
  }

  participants(trip: Trip): HouseholdMember[] {
    return trip.participants
      .map(id => this.members.find(m => m.userId === id))
      .filter((member): member is HouseholdMember => Boolean(member));
  }

  color(name: string): string {
    return memberColor(name);
  }

  initial(name: string): string {
    return memberInitial(name);
  }

  openTrip(trip: Trip) {
    this.router.navigate(['/tabs/trips', trip.id]);
  }

  async createTrip() {
    const modal = await this.modalController.create({
      component: TripFormModalComponent,
      componentProps: { members: this.members },
      breakpoints: [0, 0.92],
      initialBreakpoint: 0.92
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (!data?.trip) return;

    try {
      const trip = await this.tripService.createTrip(data.trip);
      this.toastService.success('Voyage créé !');
      this.openTrip(trip);
    } catch (error) {
      console.error('Error creating trip:', error);
      this.toastService.error((error as Error).message || 'Impossible de créer le voyage');
    }
  }
}
