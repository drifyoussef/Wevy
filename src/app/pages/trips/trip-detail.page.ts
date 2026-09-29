import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonBackButton, IonIcon, IonSpinner,
  IonModal, AlertController, ModalController, NavController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  airplane, sunny, snow, business, bonfire, car, boat, train, createOutline, calendarOutline, locationOutline,
  timeOutline, bagHandleOutline, walletOutline, peopleOutline, documentTextOutline, checkmark, close, add,
  trashOutline, arrowForward, alertCircleOutline, refreshOutline, chevronForward, mapOutline, cashOutline
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { TripService } from '../../services/trip.service';
import { HouseholdService } from '../../services/household.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { PackingItem, Trip, TripActivity, TripExpense } from '../../models/trip.model';
import { HouseholdMember } from '../../models/user.model';
import { memberColor, memberInitial } from '../../utils/member.utils';
import { toIsoDate } from '../../utils/date.utils';
import { TripFormModalComponent } from './trip-form-modal.component';
import {
  coverGradient, formatDateRange, formatEuros, parseIsoDate, tripCountdown, tripDuration, tripStatus
} from './trip.utils';

type Tab = 'overview' | 'packing' | 'program' | 'expenses';

interface TripDay {
  iso: string;
  index: number;
  label: string;
}

interface PersonBalance {
  userId: string;
  paid: number;
  share: number;
  balance: number;
}

@Component({
  selector: 'app-trip-detail',
  templateUrl: './trip-detail.page.html',
  styleUrls: ['./trip-detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonBackButton, IonIcon, IonSpinner, IonModal
  ]
})
export class TripDetailPage implements OnInit, OnDestroy {
  readonly coverGradient = coverGradient;
  readonly formatDateRange = formatDateRange;
  readonly formatEuros = formatEuros;

  trip: Trip | null = null;
  loading = true;
  error = '';
  tab: Tab = 'overview';

  members: HouseholdMember[] = [];
  currentUserId: string | null = null;

  // Packing
  newItemLabel = '';
  newItemAssignee = '';

  // Program
  activityOpen = false;
  activityForm: { id?: string; date: string; time: string; title: string; location: string } = this.emptyActivity('');
  activityError = '';

  // Expenses
  expenseOpen = false;
  expenseForm = { label: '', amount: '', paidBy: '', splitBetween: new Set<string>(), date: '' };
  expenseError = '';

  saving = false;

  private tripId = '';
  private subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private tripService: TripService,
    private householdService: HouseholdService,
    private authService: AuthService,
    private toastService: ToastService,
    private alertController: AlertController,
    private modalController: ModalController,
    private navController: NavController
  ) {
    addIcons({
      airplane, sunny, snow, business, bonfire, car, boat, train, createOutline, calendarOutline, locationOutline,
      timeOutline, bagHandleOutline, walletOutline, peopleOutline, documentTextOutline, checkmark, close, add,
      trashOutline, arrowForward, alertCircleOutline, refreshOutline, chevronForward, mapOutline, cashOutline
    });
  }

  ngOnInit() {
    this.tripId = this.route.snapshot.paramMap.get('id') || '';
    this.subscriptions.add(this.householdService.currentHousehold$.subscribe(h => this.members = h?.members || []));
    this.subscriptions.add(this.authService.currentUser$.subscribe(u => this.currentUserId = u?.id || null));
    this.load();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      this.trip = await this.tripService.getTrip(this.tripId);
    } catch (error) {
      console.error('Error loading trip:', error);
      this.error = (error as { statusCode?: number }).statusCode === 404
        ? "Ce voyage n'existe plus."
        : 'Impossible de charger ce voyage. Vérifie ta connexion et réessaie.';
    } finally {
      this.loading = false;
    }
  }

  // ---------- People ----------

  get participants(): string[] {
    return this.trip?.participants || [];
  }

  nameOf(userId: string | undefined): string {
    if (!userId) return '';
    if (userId === this.currentUserId) return 'Vous';
    return this.members.find(m => m.userId === userId)?.displayName || 'Ancien membre';
  }

  colorOf(userId: string | undefined): string {
    return memberColor(this.members.find(m => m.userId === userId)?.displayName);
  }

  initialOf(userId: string | undefined): string {
    return memberInitial(this.members.find(m => m.userId === userId)?.displayName);
  }

  // ---------- Header / overview ----------

  get countdown(): string {
    return this.trip ? tripCountdown(this.trip) : '';
  }

  get isOngoing(): boolean {
    return this.trip ? tripStatus(this.trip) === 'ongoing' : false;
  }

  get duration(): number {
    return this.trip ? tripDuration(this.trip) : 0;
  }

  get packedCount(): number {
    return this.trip?.packing.filter(item => item.checked).length || 0;
  }

  get total(): number {
    return this.trip ? this.tripService.total(this.trip) : 0;
  }

  async editTrip() {
    if (!this.trip) return;
    const modal = await this.modalController.create({
      component: TripFormModalComponent,
      componentProps: { trip: this.trip, members: this.members },
      breakpoints: [0, 0.92],
      initialBreakpoint: 0.92
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (!data?.trip) return;

    await this.run(() => this.tripService.updateTrip(this.trip!.id, data.trip), 'Voyage modifié');
  }

  async deleteTrip() {
    if (!this.trip) return;
    const confirmed = await this.confirm(
      'Supprimer ce voyage ?',
      `« ${this.trip.name} », sa valise, son programme et ses dépenses seront supprimés pour tout le foyer.`
    );
    if (!confirmed) return;

    try {
      await this.tripService.deleteTrip(this.trip.id);
      this.toastService.success('Voyage supprimé');
      this.navController.navigateBack('/tabs/trips');
    } catch (error) {
      console.error('Error deleting trip:', error);
      this.toastService.error('Impossible de supprimer ce voyage');
    }
  }

  // ---------- Packing ----------

  get packingByState(): { todo: PackingItem[]; done: PackingItem[] } {
    const items = this.trip?.packing || [];
    return { todo: items.filter(i => !i.checked), done: items.filter(i => i.checked) };
  }

  async addPackingItem() {
    const label = this.newItemLabel.trim();
    if (!label || !this.trip) return;
    this.newItemLabel = '';
    await this.run(() => this.tripService.addPackingItem(this.trip!.id, label, this.newItemAssignee || undefined));
  }

  async togglePackingItem(item: PackingItem) {
    if (!this.trip) return;
    item.checked = !item.checked; // optimistic
    try {
      this.trip = await this.tripService.togglePackingItem(this.trip.id, item.id, item.checked);
    } catch (error) {
      item.checked = !item.checked;
      console.error('Error toggling packing item:', error);
      this.toastService.error("Impossible de cocher l'élément");
    }
  }

  async deletePackingItem(item: PackingItem, event: Event) {
    event.stopPropagation();
    if (!this.trip) return;
    await this.run(() => this.tripService.deletePackingItem(this.trip!.id, item.id));
  }

  // ---------- Program ----------

  get days(): TripDay[] {
    if (!this.trip) return [];
    const start = parseIsoDate(this.trip.startDate);
    return Array.from({ length: this.duration }, (_, index) => {
      const date = new Date(start);
      date.setDate(date.getDate() + index);
      return {
        iso: toIsoDate(date),
        index,
        label: date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      };
    });
  }

  activitiesOf(iso: string): TripActivity[] {
    return (this.trip?.activities || [])
      .filter(a => a.date === iso)
      .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
  }

  openActivity(dayIso: string, activity?: TripActivity) {
    this.activityForm = activity
      ? { id: activity.id, date: activity.date, time: activity.time || '', title: activity.title, location: activity.location || '' }
      : this.emptyActivity(dayIso);
    this.activityError = '';
    this.activityOpen = true;
  }

  async saveActivity() {
    if (!this.trip || this.saving) return;
    const form = this.activityForm;
    if (!form.title.trim()) {
      this.activityError = 'Donne un nom à cette activité';
      return;
    }

    const activity = {
      date: form.date,
      title: form.title.trim(),
      ...(form.time ? { time: form.time } : {}),
      ...(form.location.trim() ? { location: form.location.trim() } : {})
    };
    const ok = await this.run(() => form.id
      ? this.tripService.updateActivity(this.trip!.id, form.id, activity)
      : this.tripService.addActivity(this.trip!.id, activity), undefined, message => this.activityError = message);
    if (ok) this.activityOpen = false;
  }

  async deleteActivity() {
    const id = this.activityForm.id;
    if (!this.trip || !id) return;
    const ok = await this.run(() => this.tripService.deleteActivity(this.trip!.id, id));
    if (ok) this.activityOpen = false;
  }

  // ---------- Expenses ----------

  get expensesByDate(): TripExpense[] {
    return [...(this.trip?.expenses || [])].sort((a, b) => b.date.localeCompare(a.date));
  }

  get balances(): PersonBalance[] {
    if (!this.trip) return [];
    const balances = this.tripService.balances(this.trip);
    return this.participants.map(userId => {
      const paid = this.trip!.expenses.filter(e => e.paidBy === userId).reduce((sum, e) => sum + e.amount, 0);
      const balance = balances.get(userId) || 0;
      return { userId, paid, share: paid - balance, balance };
    });
  }

  get settlements() {
    return this.trip ? this.tripService.settlements(this.trip) : [];
  }

  openExpense() {
    this.expenseForm = {
      label: '',
      amount: '',
      paidBy: this.participants.includes(this.currentUserId || '') ? this.currentUserId! : this.participants[0],
      splitBetween: new Set(this.participants),
      date: this.defaultExpenseDate()
    };
    this.expenseError = '';
    this.expenseOpen = true;
  }

  toggleSplit(userId: string) {
    const split = this.expenseForm.splitBetween;
    if (split.has(userId)) {
      if (split.size > 1) split.delete(userId);
    } else {
      split.add(userId);
    }
  }

  /** "12,50" or "12.5" -> 1250 cents */
  private parseAmount(value: string): number {
    const amount = Number(String(value).replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(amount) ? Math.round(amount * 100) : NaN;
  }

  get expensePerPerson(): string {
    const cents = this.parseAmount(this.expenseForm.amount);
    const people = this.expenseForm.splitBetween.size;
    return cents > 0 && people > 0 ? formatEuros(Math.ceil(cents / people)) : '';
  }

  async saveExpense() {
    if (!this.trip || this.saving) return;
    const form = this.expenseForm;
    const amount = this.parseAmount(form.amount);
    if (!form.label.trim()) {
      this.expenseError = 'À quoi correspond cette dépense ?';
      return;
    }
    if (!(amount > 0)) {
      this.expenseError = 'Indique un montant';
      return;
    }

    const ok = await this.run(() => this.tripService.addExpense(this.trip!.id, {
      label: form.label.trim(),
      amount,
      paidBy: form.paidBy,
      splitBetween: [...form.splitBetween],
      date: form.date
    }), 'Dépense ajoutée', message => this.expenseError = message);
    if (ok) this.expenseOpen = false;
  }

  async deleteExpense(expense: TripExpense) {
    if (!this.trip) return;
    const confirmed = await this.confirm('Supprimer cette dépense ?', `${expense.label} · ${formatEuros(expense.amount)}`);
    if (!confirmed) return;
    await this.run(() => this.tripService.deleteExpense(this.trip!.id, expense.id));
  }

  formatShortDate(iso: string): string {
    return parseIsoDate(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  // ---------- Helpers ----------

  /**
   * Runs a call that returns the updated trip; shows errors as a toast, or through `onError`
   * (inside a sheet). Returns true when it worked.
   */
  private async run(call: () => Promise<Trip>, successMessage?: string, onError?: (message: string) => void): Promise<boolean> {
    this.saving = true;
    try {
      this.trip = await call();
      if (successMessage) this.toastService.success(successMessage);
      return true;
    } catch (error) {
      console.error('Trip update failed:', error);
      const message = (error as Error).message || 'Une erreur est survenue';
      if (onError) onError(message);
      else this.toastService.error(message);
      return false;
    } finally {
      this.saving = false;
    }
  }

  private async confirm(header: string, message: string): Promise<boolean> {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        { text: 'Supprimer', role: 'destructive' }
      ]
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'destructive';
  }

  private emptyActivity(date: string) {
    return { date, time: '', title: '', location: '' };
  }

  /** Today during the trip, otherwise its first day. */
  private defaultExpenseDate(): string {
    const today = toIsoDate(new Date());
    if (!this.trip) return today;
    return today >= this.trip.startDate && today <= this.trip.endDate ? today : this.trip.startDate;
  }
}
