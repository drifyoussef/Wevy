import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { MemberSchedule, NewScheduleSlots } from '../models/schedule.model';

/**
 * Weekly schedules of the household members.
 * Stored on the backend (not in localStorage) so every member sees everyone's schedule.
 */
@Injectable({
  providedIn: 'root'
})
export class ScheduleService {
  constructor(private api: ApiService) {}

  async getSchedules(householdId: string): Promise<MemberSchedule[]> {
    const response = await this.api.getAsync<{ schedules: MemberSchedule[] }>(`schedules/${householdId}`);
    return response.schedules || [];
  }

  /** Adds one slot per selected day to the current user's schedule and returns it. */
  async addSlots(householdId: string, input: NewScheduleSlots): Promise<MemberSchedule> {
    const response = await this.api.postAsync<{ schedule: MemberSchedule }>(`schedules/${householdId}/slots`, input);
    return response.schedule;
  }

  /** Removes one of the current user's own slots and returns the updated schedule. */
  async deleteSlot(householdId: string, slotId: string): Promise<MemberSchedule> {
    const response = await this.api.deleteAsync<{ schedule: MemberSchedule }>(`schedules/${householdId}/slots/${slotId}`);
    return response.schedule;
  }
}
