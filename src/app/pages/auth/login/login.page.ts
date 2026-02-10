import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList,
  IonItem, IonInput, IonButton, IonText, IonSpinner, IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eye, eyeOff } from 'ionicons/icons';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonList,
    IonItem, IonInput, IonButton, IonText, IonSpinner, IonIcon
  ]
})
export class LoginPage {
  showPassword = false;
  loading = false;
  error = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    addIcons({ 'eye': eye, 'eye-off': eyeOff });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async login(emailInput: IonInput, passwordInput: IonInput) {
    const email = String(emailInput.value);
    const password = String(passwordInput.value);

    if (!email || !password) {
      this.error = 'Veuillez remplir tous les champs';
      return;
    }

    try {
      this.loading = true;
      this.error = '';
      await this.authService.signIn(email, password);
      this.router.navigate(['/tabs/home']);
    } catch (error: unknown) {
      this.error = error instanceof Error ? error.message : 'Erreur de connexion';
      console.error('Login error:', error);
    } finally {
      this.loading = false;
    }
  }
}
