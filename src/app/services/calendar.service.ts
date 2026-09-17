import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CalendarEvent, CreateCalendarEventInput } from '../models/calendar-event.model';

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private readonly STORAGE_KEY = 'wevy_calendar_events';
  private eventsSubject: BehaviorSubject<CalendarEvent[]>;

  private defaultEvents: CalendarEvent[] = [];

  constructor() {
    this.eventsSubject = new BehaviorSubject<CalendarEvent[]>(this.loadFromStorage());
  }

  private loadFromStorage(): CalendarEvent[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const events = JSON.parse(stored) as CalendarEvent[];
        return events.map(event => ({
          ...event,
          createdAt: new Date(event.createdAt),
          updatedAt: new Date(event.updatedAt)
        }));
      }
    } catch (error) {
      console.error('Error loading calendar events from storage:', error);
    }
    return [...this.defaultEvents];
  }

  private saveToStorage(events: CalendarEvent[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(events));
    } catch (error) {
      console.error('Error saving calendar events to storage:', error);
    }
  }

  private updateEvents(events: CalendarEvent[]): void {
    this.saveToStorage(events);
    this.eventsSubject.next(events);
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
      map(events => this.getEventsForDate(date))
    );
  }

  createEvent(input: CreateCalendarEventInput): CalendarEvent {
    const event: CalendarEvent = {
      id: `event-${Date.now()}`,
      title: input.title,
      date: input.date,
      time: input.time,
      location: input.location,
      type: input.type,
      color: input.color,
      householdId: input.householdId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.updateEvents([...this.eventsSubject.value, event]);
    return event;
  }

  deleteEvent(eventId: string): void {
    const events = this.eventsSubject.value.filter(e => e.id !== eventId);
    this.updateEvents(events);
  }
}
