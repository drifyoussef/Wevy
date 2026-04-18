import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonToggle, IonBackButton, IonCard, IonCardContent,
  IonSelect, IonSelectOption
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, notifications, phonePortrait, mail } from 'ionicons/icons';

interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  swipeReminders: boolean;
  mealReminders: boolean;
  taskReminders: boolean;
  familyUpdates: boolean;
  notificationFrequency: 'realtime' | 'daily' | 'weekly';
}

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonToggle, IonBackButton, IonCard, IonCardContent,
    IonSelect, IonSelectOption
  ]
})
export class SettingsPage implements OnInit {
  selectedTab = 'notifications';
  preferences: NotificationPreferences = {
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    swipeReminders: true,
    mealReminders: true,
    taskReminders: true,
    familyUpdates: true,
    notificationFrequency: 'realtime'
  };

  frequencyOptions = [
    { label: 'En temps réel', value: 'realtime' },
    { label: 'Quotidien', value: 'daily' },
    { label: 'Hebdomadaire', value: 'weekly' }
  ];

  constructor() {
    addIcons({ arrowBack, notifications, phonePortrait, mail });
  }

  ngOnInit() {
    this.loadPreferences();
  }

  loadPreferences() {
    try {
      const stored = localStorage.getItem('wevy_notification_preferences');
      if (stored) {
        this.preferences = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  }

  savePreferences() {
    try {
      localStorage.setItem('wevy_notification_preferences', JSON.stringify(this.preferences));
      alert('Paramètres sauvegardés');
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }

  goBack() {
    window.history.back();
  }
}
