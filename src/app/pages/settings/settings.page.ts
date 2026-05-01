import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonToggle, IonBackButton, IonCard, IonCardContent,
  IonSelect, IonSelectOption, IonInput, IonLabel, IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, notifications, phonePortrait, mail } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

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

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
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
    IonSelect, IonSelectOption, IonInput, IonLabel, IonSpinner
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

  passwordForm: PasswordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  passwordError = '';
  passwordSuccess = '';
  isChangingPassword = false;

  frequencyOptions = [
    { label: 'En temps réel', value: 'realtime' },
    { label: 'Quotidien', value: 'daily' },
    { label: 'Hebdomadaire', value: 'weekly' }
  ];

  constructor(private authService: AuthService) {
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

  async changePassword() {
    // Reset messages
    this.passwordError = '';
    this.passwordSuccess = '';

    // Validation
    if (!this.passwordForm.currentPassword.trim()) {
      this.passwordError = 'Veuillez entrer votre mot de passe actuel';
      return;
    }

    if (!this.passwordForm.newPassword.trim()) {
      this.passwordError = 'Veuillez entrer le nouveau mot de passe';
      return;
    }

    if (this.passwordForm.newPassword.length < 6) {
      this.passwordError = 'Le nouveau mot de passe doit contenir au moins 6 caractères';
      return;
    }

    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.passwordError = 'Les mots de passe ne correspondent pas';
      return;
    }

    if (this.passwordForm.currentPassword === this.passwordForm.newPassword) {
      this.passwordError = 'Le nouveau mot de passe doit être différent de l\'ancien';
      return;
    }

    // Call API
    try {
      this.isChangingPassword = true;
      await this.authService.changePassword(
        this.passwordForm.currentPassword,
        this.passwordForm.newPassword
      );

      this.passwordSuccess = 'Mot de passe changé avec succès!';
      
      // Reset form
      this.passwordForm = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      };

      // Clear success message after 3 seconds
      setTimeout(() => {
        this.passwordSuccess = '';
      }, 3000);
    } catch (error: unknown) {
      console.error('Change password error:', error);
      
      // Handle different error types
      if (error instanceof Error) {
        this.passwordError = error.message;
      } else if (typeof error === 'object' && error !== null && 'error' in error) {
        const httpError = error as Record<string, unknown>;
        if (typeof httpError.error === 'object' && httpError.error !== null && 'error' in httpError.error) {
          const apiError = httpError.error as Record<string, unknown>;
          this.passwordError = String(apiError.error || 'Erreur lors du changement de mot de passe');
        } else {
          this.passwordError = String(httpError.error || 'Erreur lors du changement de mot de passe');
        }
      } else {
        this.passwordError = 'Erreur lors du changement de mot de passe';
      }
    } finally {
      this.isChangingPassword = false;
    }
  }

  goBack() {
    window.history.back();
  }
}
