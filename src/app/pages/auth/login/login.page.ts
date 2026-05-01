import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList,
  IonItem, IonInput, IonButton, IonText, IonSpinner, IonIcon,
  IonButtons, IonBackButton, IonCard, IonCardContent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eye, eyeOff } from 'ionicons/icons';
import { AuthService } from '../../../services/auth.service';

interface ForgotPasswordForm {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonList,
    IonItem, IonInput, IonButton, IonText, IonSpinner, IonIcon,
    IonButtons, IonBackButton, IonCard, IonCardContent
  ]
})
export class LoginPage {
  showPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  loading = false;
  error = '';

  // Forgot password
  showForgotPassword = false;
  forgotPasswordStep = 1;
  forgotPasswordLoading = false;
  forgotPasswordError = '';
  forgotPasswordSuccess = '';
  forgotPasswordForm: ForgotPasswordForm = {
    email: '',
    code: '',
    newPassword: '',
    confirmPassword: ''
  };

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    addIcons({ 'eye': eye, 'eye-off': eyeOff });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  goBackToLogin() {
    this.showForgotPassword = false;
    this.forgotPasswordStep = 1;
    this.forgotPasswordForm = {
      email: '',
      code: '',
      newPassword: '',
      confirmPassword: ''
    };
    this.forgotPasswordError = '';
    this.forgotPasswordSuccess = '';
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

  async requestResetCode() {
    // Validation
    if (!this.forgotPasswordForm.email.trim()) {
      this.forgotPasswordError = 'Veuillez entrer votre email';
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.forgotPasswordForm.email)) {
      this.forgotPasswordError = 'Veuillez entrer un email valide';
      return;
    }

    try {
      this.forgotPasswordLoading = true;
      this.forgotPasswordError = '';
      await this.authService.requestPasswordReset(this.forgotPasswordForm.email);
      this.forgotPasswordStep = 2;
    } catch (error: unknown) {
      console.error('Request reset code error:', error);
      // Show generic message for security
      const errorMsg = error instanceof Error && (error as any).error?.error 
        ? (error as any).error.error 
        : 'Erreur lors de l\'envoi du code';
      this.forgotPasswordError = errorMsg;
    } finally {
      this.forgotPasswordLoading = false;
    }
  }

  async resetPassword() {
    // Reset messages
    this.forgotPasswordError = '';
    this.forgotPasswordSuccess = '';

    // Validation
    if (!this.forgotPasswordForm.code.trim()) {
      this.forgotPasswordError = 'Veuillez entrer le code';
      return;
    }

    if (!this.forgotPasswordForm.newPassword.trim()) {
      this.forgotPasswordError = 'Veuillez entrer le nouveau mot de passe';
      return;
    }

    if (this.forgotPasswordForm.newPassword.length < 6) {
      this.forgotPasswordError = 'Le mot de passe doit contenir au moins 6 caractères';
      return;
    }

    if (this.forgotPasswordForm.newPassword !== this.forgotPasswordForm.confirmPassword) {
      this.forgotPasswordError = 'Les mots de passe ne correspondent pas';
      return;
    }

    try {
      this.forgotPasswordLoading = true;
      this.forgotPasswordError = '';
      
      console.log('Sending password reset request...');
      console.log('Email:', this.forgotPasswordForm.email);
      console.log('Code:', this.forgotPasswordForm.code);
      
      const response = await this.authService.resetPassword(
        this.forgotPasswordForm.email,
        this.forgotPasswordForm.code,
        this.forgotPasswordForm.newPassword
      );
      
      console.log('Password reset successful:', response);
      this.forgotPasswordSuccess = 'Mot de passe réinitialisé avec succès!';
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        this.goBackToLogin();
      }, 2000);
    } catch (error: unknown) {
      console.error('Reset password error:', error);
      console.error('Error details:', {
        error,
        isError: error instanceof Error,
        message: error instanceof Error ? error.message : typeof error
      });
      
      let errorMsg = 'Erreur lors de la réinitialisation';
      
      if (error instanceof Error) {
        errorMsg = error.message;
        if ((error as any).error?.error) {
          errorMsg = (error as any).error.error;
        }
      }
      
      this.forgotPasswordError = errorMsg;
    } finally {
      this.forgotPasswordLoading = false;
    }
  }
}
