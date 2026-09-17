import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission === 'denied') {
      return false;
    }
    try {
      const result = await Notification.requestPermission();
      return result === 'granted';
    } catch {
      return false;
    }
  }

  async notify(title: string, body: string) {
    const granted = await this.requestPermission();
    if (!granted) {
      return;
    }
    try {
      new Notification(title, { body });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  async notifyTaskAssigned(taskTitle: string) {
    await this.notify('Nouvelle tâche', `On t'a assigné : ${taskTitle}`);
  }
}
