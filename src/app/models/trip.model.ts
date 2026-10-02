export type TripCover = 'airplane' | 'sunny' | 'snow' | 'business' | 'bonfire' | 'car' | 'boat' | 'train';

export const TRIP_COVERS: { value: TripCover; label: string; gradient: [string, string] }[] = [
  { value: 'airplane', label: 'Avion', gradient: ['#8EC3AF', '#4F8A76'] },
  { value: 'sunny', label: 'Plage', gradient: ['#F7C873', '#E8935A'] },
  { value: 'snow', label: 'Montagne', gradient: ['#A7C7E7', '#5C8DB8'] },
  { value: 'business', label: 'Ville', gradient: ['#B8A9D9', '#7A68B0'] },
  { value: 'bonfire', label: 'Camping', gradient: ['#E0A77F', '#A8603A'] },
  { value: 'car', label: 'Road trip', gradient: ['#9FB5AC', '#516B62'] },
  { value: 'boat', label: 'Bateau', gradient: ['#7FC8D6', '#3E8E9E'] },
  { value: 'train', label: 'Train', gradient: ['#E39AA6', '#B85C6E'] },
];

export interface PackingItem {
  id: string;
  label: string;
  checked: boolean;
  /** userId of the member who takes care of it */
  assignedTo?: string;
}

export interface TripActivity {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  title: string;
  location?: string;
}

export interface TripExpense {
  id: string;
  label: string;
  /** In cents, to avoid rounding errors when splitting */
  amount: number;
  paidBy: string;
  splitBetween: string[];
  date: string;
  createdBy: string;
}

export interface Trip {
  id: string;
  householdId: string;
  name: string;
  destination: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  cover: TripCover;
  participants: string[];
  notes: string;
  /** In cents; absent when no budget was set */
  budget?: number;
  packing: PackingItem[];
  activities: TripActivity[];
  expenses: TripExpense[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TripInput {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  cover: TripCover;
  participants: string[];
  notes: string;
}

/** "Alice owes Bob 12,50 €" */
export interface Settlement {
  from: string;
  to: string;
  amount: number; // cents
}
