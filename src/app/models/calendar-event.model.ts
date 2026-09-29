export type EventType = 'rendezvous' | 'reunion' | 'anniversaire' | 'loisir' | 'autre';

export interface EventTypeOption {
  value: EventType;
  label: string;
  color: string;
}

export const EVENT_TYPES: EventTypeOption[] = [
  { value: 'rendezvous', label: 'Rendez-vous', color: '#3B82F6' },
  { value: 'reunion', label: 'Réunion', color: '#EF4444' },
  { value: 'anniversaire', label: 'Anniversaire', color: '#F3A537' },
  { value: 'loisir', label: 'Loisir', color: '#74B39D' },
  { value: 'autre', label: 'Autre', color: '#8B5CF6' },
];

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date, format YYYY-MM-DD
  time?: string; // HH:mm, optional (all-day event if omitted)
  location?: string;
  type: EventType;
  color: string;
  householdId: string;
  /** userId of the member who added it */
  createdBy?: string;
  /** Their name when they added it (fallback if they have left the household since) */
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCalendarEventInput {
  title: string;
  date: string;
  time?: string;
  location?: string;
  type: EventType;
  color: string;
}
