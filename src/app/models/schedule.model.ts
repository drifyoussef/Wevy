/** 0 = lundi ... 6 = dimanche (same order as DAY_LETTERS in date.utils) */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** A weekly recurring time slot, e.g. "Travail, lundi 09:00 - 17:00". */
export interface ScheduleSlot {
  id: string;
  day: WeekDay;
  start: string; // HH:mm
  end: string;   // HH:mm
  label: string;
  /** Optional break inside the slot (lunch...), HH:mm */
  breakStart?: string;
  breakEnd?: string;
}

export interface MemberSchedule {
  userId: string;
  slots: ScheduleSlot[];
}

export interface NewScheduleSlots {
  days: WeekDay[];
  start: string;
  end: string;
  label: string;
  breakStart?: string;
  breakEnd?: string;
}
