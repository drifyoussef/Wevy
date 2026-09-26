import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonBackButton, IonIcon,
  IonModal, IonSpinner, IonToggle, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add, close, cloudOfflineOutline, refreshOutline, homeOutline, chevronForward, sunnyOutline, timeOutline, cafeOutline
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { HouseholdService } from '../../services/household.service';
import { AuthService } from '../../services/auth.service';
import { ScheduleService } from '../../services/schedule.service';
import { ToastService } from '../../services/toast.service';
import { Household, HouseholdMember } from '../../models/user.model';
import { MemberSchedule, ScheduleSlot, WeekDay } from '../../models/schedule.model';
import { DAY_LETTERS } from '../../utils/date.utils';

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const WEEK: WeekDay[] = [0, 1, 2, 3, 4, 5, 6];
const WORK_WEEK: WeekDay[] = [0, 1, 2, 3, 4];
const LABEL_SUGGESTIONS = ['Travail', 'École', 'Sport', 'Rendez-vous'];
const AVATAR_COLORS = ['#74B39D', '#4F8A76', '#6FA8DC', '#9FB5AC', '#5C9EA6'];

type PageState = 'loading' | 'ready' | 'error' | 'no-household';

interface MemberDay {
  member: HouseholdMember;
  isMe: boolean;
  slots: ScheduleSlot[];
}

@Component({
  selector: 'app-schedules',
  templateUrl: './schedules.page.html',
  styleUrls: ['./schedules.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonBackButton, IonIcon,
    IonModal, IonSpinner, IonToggle
  ]
})
export class SchedulesPage implements OnInit, OnDestroy {
  readonly week = WEEK;
  readonly dayLetters = DAY_LETTERS;
  readonly dayNames = DAY_NAMES;
  readonly labelSuggestions = LABEL_SUGGESTIONS;

  state: PageState = 'loading';
  household: Household | null = null;
  currentUserId: string | null = null;
  private schedules = new Map<string, ScheduleSlot[]>();

  /** 0 = lundi: JS getDay() starts the week on Sunday. */
  readonly today = ((new Date().getDay() + 6) % 7) as WeekDay;
  selectedDay: WeekDay = this.today;
  memberDays: MemberDay[] = [];

  // Add sheet
  addOpen = false;
  saving = false;
  formError = '';
  form = this.emptyForm(new Set<WeekDay>());

  private subscriptions = new Subscription();

  constructor(
    private householdService: HouseholdService,
    private authService: AuthService,
    private scheduleService: ScheduleService,
    private toastService: ToastService,
    private alertController: AlertController
  ) {
    addIcons({ add, close, cloudOfflineOutline, refreshOutline, homeOutline, chevronForward, sunnyOutline, timeOutline, cafeOutline });
  }

  ngOnInit() {
    this.subscriptions.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUserId = user?.id || null;
        this.buildDay();
      })
    );
    this.load();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  async load() {
    this.state = 'loading';
    try {
      // Waits for the household to be really loaded (no false "no household" right after a refresh)
      this.household = await this.householdService.getCurrentHousehold();
      if (!this.household) {
        this.state = this.householdService.loadState === 'error' ? 'error' : 'no-household';
        return;
      }

      const schedules = await this.scheduleService.getSchedules(this.household.id);
      this.schedules = new Map(schedules.map(schedule => [schedule.userId, schedule.slots]));
      this.state = 'ready';
      this.buildDay();
    } catch (error) {
      console.error('Error loading schedules:', error);
      this.state = 'error';
    }
  }

  selectDay(day: WeekDay) {
    this.selectedDay = day;
    this.buildDay();
  }

  /** How many members have something on that day, shown as dots under the day letter. */
  busyColors(day: WeekDay): string[] {
    return (this.household?.members || [])
      .filter(member => (this.schedules.get(member.userId) || []).some(slot => slot.day === day))
      .slice(0, 3)
      .map(member => this.avatarColor(member.displayName));
  }

  avatarColor(name: string): string {
    return AVATAR_COLORS[(name || 'U').charCodeAt(0) % AVATAR_COLORS.length];
  }

  // ---------- Add sheet ----------

  openAdd() {
    this.form = this.emptyForm(new Set<WeekDay>([this.selectedDay]));
    this.formError = '';
    this.addOpen = true;
  }

  toggleFormDay(day: WeekDay) {
    if (this.form.days.has(day)) {
      this.form.days.delete(day);
    } else {
      this.form.days.add(day);
    }
  }

  selectWorkWeek() {
    this.form.days = new Set(WORK_WEEK);
  }

  async saveSlots() {
    if (!this.household || this.saving) return;

    const label = this.form.label.trim();
    if (!label) {
      this.formError = 'Donne un nom à ce créneau (Travail, École...)';
      return;
    }
    if (this.form.days.size === 0) {
      this.formError = 'Choisis au moins un jour';
      return;
    }
    if (!this.form.start || !this.form.end || this.form.start >= this.form.end) {
      this.formError = "L'heure de fin doit être après l'heure de début";
      return;
    }
    if (this.form.hasBreak) {
      if (!this.form.breakStart || !this.form.breakEnd || this.form.breakStart >= this.form.breakEnd) {
        this.formError = 'La fin de la pause doit être après son début';
        return;
      }
      if (this.form.breakStart <= this.form.start || this.form.breakEnd >= this.form.end) {
        this.formError = `La pause doit être comprise entre ${this.form.start} et ${this.form.end}`;
        return;
      }
    }

    this.saving = true;
    this.formError = '';
    try {
      const schedule = await this.scheduleService.addSlots(this.household.id, {
        days: [...this.form.days].sort(),
        start: this.form.start,
        end: this.form.end,
        label,
        ...(this.form.hasBreak ? { breakStart: this.form.breakStart, breakEnd: this.form.breakEnd } : {})
      });
      this.applyOwnSchedule(schedule);
      this.addOpen = false;
      this.toastService.success(this.form.days.size > 1 ? 'Créneaux ajoutés' : 'Créneau ajouté');
    } catch (error) {
      console.error('Error adding slots:', error);
      this.formError = (error as Error).message || "Impossible d'ajouter ce créneau";
    } finally {
      this.saving = false;
    }
  }

  async deleteSlot(slot: ScheduleSlot) {
    if (!this.household) return;

    const alert = await this.alertController.create({
      header: 'Supprimer ce créneau ?',
      message: `${slot.label}, ${DAY_NAMES[slot.day].toLowerCase()} ${slot.start} – ${slot.end}`
        + (slot.breakStart ? ` (pause ${slot.breakStart} – ${slot.breakEnd})` : ''),
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        { text: 'Supprimer', role: 'destructive' }
      ]
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'destructive') return;

    try {
      const schedule = await this.scheduleService.deleteSlot(this.household.id, slot.id);
      this.applyOwnSchedule(schedule);
    } catch (error) {
      console.error('Error deleting slot:', error);
      this.toastService.error('Impossible de supprimer ce créneau');
    }
  }

  private emptyForm(days: Set<WeekDay>) {
    return {
      label: '',
      days,
      start: '09:00',
      end: '17:00',
      hasBreak: false,
      breakStart: '12:00',
      breakEnd: '13:00'
    };
  }

  private applyOwnSchedule(schedule: MemberSchedule) {
    this.schedules.set(schedule.userId, schedule.slots);
    this.buildDay();
  }

  /** Every member for the selected day, me first, with their slots in time order. */
  private buildDay() {
    const members = this.household?.members || [];
    this.memberDays = members
      .map(member => ({
        member,
        isMe: member.userId === this.currentUserId,
        slots: (this.schedules.get(member.userId) || [])
          .filter(slot => slot.day === this.selectedDay)
          .sort((a, b) => a.start.localeCompare(b.start))
      }))
      .sort((a, b) => Number(b.isMe) - Number(a.isMe));
  }
}
