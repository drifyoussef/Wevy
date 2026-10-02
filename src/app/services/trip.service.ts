import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { HouseholdService } from './household.service';
import { Settlement, Trip, TripActivity, TripExpense, TripInput } from '../models/trip.model';

/** Household trips, stored on the server and shared by every member. */
@Injectable({
  providedIn: 'root'
})
export class TripService {
  constructor(private api: ApiService, private householdService: HouseholdService) {}

  async getTrips(): Promise<Trip[]> {
    const householdId = await this.householdId();
    const response = await this.api.getAsync<{ trips: Trip[] }>(`trips/${householdId}`);
    return response.trips || [];
  }

  async getTrip(tripId: string): Promise<Trip> {
    const householdId = await this.householdId();
    return (await this.api.getAsync<{ trip: Trip }>(`trips/${householdId}/${tripId}`)).trip;
  }

  async createTrip(input: TripInput): Promise<Trip> {
    return this.call('post', '', input);
  }

  async updateTrip(tripId: string, input: TripInput): Promise<Trip> {
    return this.call('put', `/${tripId}`, input);
  }

  async deleteTrip(tripId: string): Promise<void> {
    const householdId = await this.householdId();
    await this.api.deleteAsync(`trips/${householdId}/${tripId}`);
  }

  // Packing list
  addPackingItem(tripId: string, label: string, assignedTo?: string): Promise<Trip> {
    return this.call('post', `/${tripId}/packing`, { label, assignedTo });
  }

  togglePackingItem(tripId: string, itemId: string, checked: boolean): Promise<Trip> {
    return this.call('patch', `/${tripId}/packing/${itemId}`, { checked });
  }

  deletePackingItem(tripId: string, itemId: string): Promise<Trip> {
    return this.call('delete', `/${tripId}/packing/${itemId}`);
  }

  // Program
  addActivity(tripId: string, activity: Omit<TripActivity, 'id'>): Promise<Trip> {
    return this.call('post', `/${tripId}/activities`, activity);
  }

  updateActivity(tripId: string, activityId: string, activity: Omit<TripActivity, 'id'>): Promise<Trip> {
    return this.call('put', `/${tripId}/activities/${activityId}`, activity);
  }

  deleteActivity(tripId: string, activityId: string): Promise<Trip> {
    return this.call('delete', `/${tripId}/activities/${activityId}`);
  }

  // Budget (cents; null removes it)
  setBudget(tripId: string, budget: number | null): Promise<Trip> {
    return this.call('put', `/${tripId}/budget`, { budget });
  }

  // Expenses
  addExpense(tripId: string, expense: Omit<TripExpense, 'id' | 'createdBy'>): Promise<Trip> {
    return this.call('post', `/${tripId}/expenses`, expense);
  }

  deleteExpense(tripId: string, expenseId: string): Promise<Trip> {
    return this.call('delete', `/${tripId}/expenses/${expenseId}`);
  }

  // ---------- Money ----------

  /** Paid minus owed, per participant (cents). Positive: the others owe them money. */
  balances(trip: Trip): Map<string, number> {
    const balances = new Map<string, number>(trip.participants.map(id => [id, 0]));

    for (const expense of trip.expenses) {
      const people = expense.splitBetween.length ? expense.splitBetween : trip.participants;
      balances.set(expense.paidBy, (balances.get(expense.paidBy) || 0) + expense.amount);

      // Split in whole cents; the leftover cents go to the first people so the total stays exact
      const share = Math.floor(expense.amount / people.length);
      let leftover = expense.amount - share * people.length;
      for (const person of people) {
        const owed = share + (leftover > 0 ? 1 : 0);
        if (leftover > 0) leftover--;
        balances.set(person, (balances.get(person) || 0) - owed);
      }
    }
    return balances;
  }

  /** The fewest transfers that settle everyone (largest debt paid to the largest credit first). */
  settlements(trip: Trip): Settlement[] {
    const balances = [...this.balances(trip).entries()];
    const creditors = balances.filter(([, amount]) => amount > 0).map(([id, amount]) => ({ id, amount }));
    const debtors = balances.filter(([, amount]) => amount < 0).map(([id, amount]) => ({ id, amount: -amount }));
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const settlements: Settlement[] = [];
    let c = 0;
    let d = 0;
    while (c < creditors.length && d < debtors.length) {
      const amount = Math.min(creditors[c].amount, debtors[d].amount);
      if (amount > 0) settlements.push({ from: debtors[d].id, to: creditors[c].id, amount });
      creditors[c].amount -= amount;
      debtors[d].amount -= amount;
      if (creditors[c].amount === 0) c++;
      if (debtors[d].amount === 0) d++;
    }
    return settlements;
  }

  total(trip: Trip): number {
    return trip.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  }

  // ---------- Helpers ----------

  private async householdId(): Promise<string> {
    const household = await this.householdService.getCurrentHousehold();
    if (!household) throw new Error('Rejoins ou crée un foyer pour préparer un voyage');
    return household.id;
  }

  private async call(method: 'post' | 'put' | 'patch' | 'delete', path: string, body: unknown = {}): Promise<Trip> {
    const endpoint = `trips/${await this.householdId()}${path}`;
    let response: { trip: Trip };
    switch (method) {
      case 'post': response = await this.api.postAsync(endpoint, body); break;
      case 'put': response = await this.api.putAsync(endpoint, body); break;
      case 'patch': response = await this.api.patchAsync(endpoint, body); break;
      case 'delete': response = await this.api.deleteAsync(endpoint); break;
    }
    return response.trip;
  }
}
