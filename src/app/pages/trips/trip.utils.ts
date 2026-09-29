import { TRIP_COVERS, Trip, TripCover } from '../../models/trip.model';
import { toIsoDate } from '../../utils/date.utils';

export type TripStatus = 'upcoming' | 'ongoing' | 'past';

const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-10-12" -> local Date at midnight (new Date("2026-10-12") would be UTC). */
export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseIsoDate(toIso).getTime() - parseIsoDate(fromIso).getTime()) / DAY_MS);
}

/** Number of days, departure and return included. */
export function tripDuration(trip: Pick<Trip, 'startDate' | 'endDate'>): number {
  return daysBetween(trip.startDate, trip.endDate) + 1;
}

export function tripStatus(trip: Pick<Trip, 'startDate' | 'endDate'>): TripStatus {
  const today = toIsoDate(new Date());
  if (trip.endDate < today) return 'past';
  if (trip.startDate > today) return 'upcoming';
  return 'ongoing';
}

/** "Dans 12 jours", "Demain", "Jour 3 sur 7", "Terminé". */
export function tripCountdown(trip: Pick<Trip, 'startDate' | 'endDate'>): string {
  const today = toIsoDate(new Date());
  switch (tripStatus(trip)) {
    case 'past':
      return 'Terminé';
    case 'ongoing':
      return `Jour ${daysBetween(trip.startDate, today) + 1} sur ${tripDuration(trip)}`;
    default: {
      const days = daysBetween(today, trip.startDate);
      return days === 1 ? 'Demain' : `Dans ${days} jours`;
    }
  }
}

/** "12 – 19 oct.", "28 sept. – 3 oct.", "30 déc. 2026 – 2 janv. 2027". */
export function formatDateRange(startIso: string, endIso: string): string {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  const sameYear = start.getFullYear() === end.getFullYear();
  const thisYear = start.getFullYear() === new Date().getFullYear() && sameYear;

  const format = (date: Date, withMonth: boolean, withYear: boolean) =>
    date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      ...(withMonth ? { month: 'short' as const } : {}),
      ...(withYear ? { year: 'numeric' as const } : {})
    });

  if (startIso === endIso) return format(start, true, !thisYear);
  if (sameYear && start.getMonth() === end.getMonth()) {
    return `${format(start, false, false)} – ${format(end, true, !thisYear)}`;
  }
  return `${format(start, true, !sameYear)} – ${format(end, true, !thisYear)}`;
}

export function coverGradient(cover: TripCover): string {
  const [from, to] = (TRIP_COVERS.find(c => c.value === cover) || TRIP_COVERS[0]).gradient;
  return `linear-gradient(145deg, ${from}, ${to})`;
}

const EURO = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

export function formatEuros(cents: number): string {
  return EURO.format(cents / 100);
}
