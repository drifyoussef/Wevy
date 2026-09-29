import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CalendarEvent, CreateCalendarEventInput } from '../models/calendar-event.model';
import { ApiService } from './api.service';
import { HouseholdService } from './household.service';

/**
 * Household calendar, stored on the server and shared by every member (each event keeps its author).
 * Reads stay synchronous (getEvents / getEventsForDate) from the in-memory copy, refreshed from the API.
 */
@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  /** Where events lived before the calendar was shared: uploaded once, then removed. */
  private readonly LEGACY_STORAGE_KEY = 'wevy_calendar_events';

  private eventsSubject = new BehaviorSubject<CalendarEvent[]>([]);
  private householdId: string | null = null;

  constructor(private api: ApiService, private householdService: HouseholdService) {
    this.householdService.currentHousehold$.subscribe(household => {
      const id = household?.id ?? null;
      if (id === this.householdId) return; // same household refreshed: nothing to reload

      this.householdId = id;
      this.eventsSubject.next([]);
      if (id) this.load(id);
    });
  }

  get events$(): Observable<CalendarEvent[]> {
    return this.eventsSubject.asObservable();
  }

  getEvents(): CalendarEvent[] {
    return this.eventsSubject.value;
  }

  getEventsForDate(date: string): CalendarEvent[] {
    return this.eventsSubject.value
      .filter(event => event.date === date)
      .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
  }

  getEventsForDate$(date: string): Observable<CalendarEvent[]> {
    return this.events$.pipe(
      map(() => this.getEventsForDate(date))
    );
  }

  async reload(): Promise<void> {
    if (this.householdId) await this.load(this.householdId);
  }

  async createEvent(input: CreateCalendarEventInput): Promise<CalendarEvent> {
    const householdId = this.householdId ?? (await this.householdService.getCurrentHousehold())?.id;
    if (!householdId) throw new Error('Rejoins ou crée un foyer pour utiliser le calendrier');

    const response = await this.api.postAsync<{ event: CalendarEvent }>(`calendar/${householdId}`, input);
    const event = this.normalize(response.event);
    this.eventsSubject.next([...this.eventsSubject.value, event]);
    return event;
  }

  /** Only the author of an event can edit it (the server refuses anyone else). */
  async updateEvent(eventId: string, input: CreateCalendarEventInput): Promise<CalendarEvent> {
    if (!this.householdId) throw new Error('Rejoins ou crée un foyer pour utiliser le calendrier');

    const response = await this.api.putAsync<{ event: CalendarEvent }>(`calendar/${this.householdId}/${eventId}`, input);
    const event = this.normalize(response.event);
    this.eventsSubject.next(this.eventsSubject.value.map(e => e.id === eventId ? event : e));
    return event;
  }

  async deleteEvent(eventId: string): Promise<void> {
    if (!this.householdId) return;
    await this.api.deleteAsync(`calendar/${this.householdId}/${eventId}`);
    this.eventsSubject.next(this.eventsSubject.value.filter(e => e.id !== eventId));
  }

  private async load(householdId: string): Promise<void> {
    try {
      const response = await this.api.getAsync<{ events: CalendarEvent[] }>(`calendar/${householdId}`);
      if (householdId !== this.householdId) return; // switched household meanwhile
      this.eventsSubject.next((response.events || []).map(event => this.normalize(event)));
      await this.uploadLegacyEvents(householdId);
    } catch (error) {
      console.error('Error loading calendar events:', error);
    }
  }

  /**
   * Before the calendar was shared, events were saved on the phone only.
   * Send them to the household once (they get the current user as author), then forget the local copy.
   */
  private async uploadLegacyEvents(householdId: string): Promise<void> {
    let legacy: Partial<CalendarEvent>[] = [];
    try {
      legacy = JSON.parse(localStorage.getItem(this.LEGACY_STORAGE_KEY) || '[]');
    } catch {
      legacy = [];
    }
    if (!Array.isArray(legacy) || legacy.length === 0) return;

    try {
      const response = await this.api.postAsync<{ events: CalendarEvent[] }>(`calendar/${householdId}/import`, {
        events: legacy.map(({ title, date, time, location, type, color }) => ({ title, date, time, location, type, color }))
      });
      localStorage.removeItem(this.LEGACY_STORAGE_KEY);
      if (householdId === this.householdId) {
        this.eventsSubject.next([...this.eventsSubject.value, ...(response.events || []).map(e => this.normalize(e))]);
      }
    } catch (error) {
      // Kept locally: the upload is retried on the next load
      console.error('Error uploading local calendar events:', error);
    }
  }

  private normalize(event: CalendarEvent): CalendarEvent {
    return {
      ...event,
      createdAt: new Date(event.createdAt),
      updatedAt: new Date(event.updatedAt)
    };
  }
}
