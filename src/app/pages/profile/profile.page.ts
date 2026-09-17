import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonButton,
  IonButtons, IonBackButton,
  ModalController, IonSegment, IonSegmentButton, IonInput, IonLabel
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  notifications, people, settings, add, close, copy, checkmark,
  trash, shieldHalf, linkOutline, key, shareSocial, exit, refresh, chevronForward, logOut
} from 'ionicons/icons';
import { HouseholdService } from '../../services/household.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Household, HouseholdMember } from '../../models/user.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonButton,
    IonButtons, IonBackButton,
    IonSegment, IonSegmentButton, IonLabel
  ]
})
export class ProfilePage implements OnInit, OnDestroy {
  household: Household | null = null;
  members: HouseholdMember[] = [];
  currentUserId: string | null = null;
  selectedTab = 'household';
  inviteLink = '';
  inviteCode = '';
  copiedLink = false;
  copiedCode = false;
  private householdSubscription?: Subscription;

  constructor(
    private householdService: HouseholdService,
    private authService: AuthService,
    private modalController: ModalController,
    private router: Router,
    private toastService: ToastService
  ) {
    addIcons({
      notifications, people, settings, add, close, copy, checkmark,
      trash, shieldHalf, linkOutline, key, shareSocial, exit, refresh, chevronForward, logOut
    });
  }

  ngOnInit() {
    const currentUser = this.authService.getCurrentUser();
    this.currentUserId = currentUser?.id || null;
    this.loadHousehold();
  }

  private loadHousehold() {
    this.householdSubscription = this.householdService.getCurrentHousehold$().subscribe(
      household => {
        this.household = household;
        this.members = household?.members || [];
        if (household) {
          this.inviteLink = household.inviteLink;
          this.inviteCode = household.inviteCode;
        }
      }
    );
  }

  async createHousehold() {
    const modal = await this.modalController.create({
      component: CreateHouseholdModalComponent
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (data) {
      const currentUser = this.authService.getCurrentUser();
      if (currentUser) {
        try {
          const household = await this.householdService.createHousehold(
            data.householdName,
            currentUser.id,
            currentUser.displayName
          );
          this.householdService.setCurrentHousehold(household);
          this.toastService.success('Foyer créé !');
        } catch (error) {
          console.error('Error creating household:', error);
          this.toastService.error('Impossible de créer le foyer');
        }
      }
    }
  }

  async joinHouseholdByCode() {
    const modal = await this.modalController.create({
      component: JoinHouseholdModalComponent
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (data && this.currentUserId && this.authService.getCurrentUser()) {
      try {
        const currentUser = this.authService.getCurrentUser();
        const household = await this.householdService.joinHouseholdByCode(
          data.inviteCode,
          this.currentUserId,
          currentUser!.displayName
        );
        if (household) {
          this.householdService.setCurrentHousehold(household);
          this.toastService.success('Tu as rejoint le foyer !');
        }
      } catch (error) {
        console.error('Error joining household:', error);
        this.toastService.error('Code ami invalide');
      }
    }
  }

  async joinHouseholdByLink(link: string) {
    if (!this.currentUserId || !this.authService.getCurrentUser()) return;

    try {
      const currentUser = this.authService.getCurrentUser();
      const household = await this.householdService.joinHouseholdByLink(
        link,
        this.currentUserId,
        currentUser!.displayName
      );
      if (household) {
        this.householdService.setCurrentHousehold(household);
        this.toastService.success('Tu as rejoint le foyer !');
      }
    } catch (error) {
      console.error('Error joining household via link:', error);
      this.toastService.error("Lien d'invitation invalide ou expiré");
    }
  }

  async regenerateInvite() {
    if (!this.household) return;

    try {
      const result = await this.householdService.regenerateInviteLink(this.household.id);
      this.inviteLink = result.link;
      this.inviteCode = result.code;
    } catch (error) {
      console.error('Error regenerating invite:', error);
    }
  }

  copyToClipboard(text: string, type: 'link' | 'code') {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'link') {
        this.copiedLink = true;
        setTimeout(() => this.copiedLink = false, 2000);
      } else {
        this.copiedCode = true;
        setTimeout(() => this.copiedCode = false, 2000);
      }
    });
  }

  shareLink() {
    if (navigator.share) {
      navigator.share({
        title: `Rejoignez mon foyer sur Wevy`,
        text: `Rejoignez mon foyer avec ce lien: ${this.inviteLink}`,
        url: this.inviteLink
      }).catch(err => console.log('Error sharing:', err));
    }
  }

  async removeMember(memberId: string) {
    if (!this.household) return;

    if (confirm('Êtes-vous sûr de vouloir retirer ce membre?')) {
      try {
        await this.householdService.removeMember(this.household.id, memberId);
      } catch (error) {
        console.error('Error removing member:', error);
      }
    }
  }

  async updateMemberRole(memberId: string, newRole: 'admin' | 'member') {
    if (!this.household) return;

    try {
      await this.householdService.updateMemberRole(this.household.id, memberId, newRole);
    } catch (error) {
      console.error('Error updating member role:', error);
    }
  }

  async leaveHousehold() {
    if (!this.household || !this.currentUserId) return;

    if (confirm('Êtes-vous sûr de vouloir quitter le foyer?')) {
      try {
        await this.householdService.leaveHousehold(this.household.id, this.currentUserId);
      } catch (error) {
        console.error('Error leaving household:', error);
      }
    }
  }

  isAdmin(member: HouseholdMember): boolean {
    return member.role === 'admin';
  }

  isCurrentUser(userId: string): boolean {
    return userId === this.currentUserId;
  }

  canManageMembers(): boolean {
    if (!this.household || !this.currentUserId) return false;
    const currentMember = this.household.members.find(m => m.userId === this.currentUserId);
    return currentMember?.role === 'admin';
  }

  goToSettings() {
    this.router.navigate(['/tabs/settings']);
  }

  async logout() {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      await this.authService.signOut();
      this.router.navigate(['/auth/login'], { replaceUrl: true });
    }
  }

  getAvatarColor(name: string): string {
    const colors = ['#74B39D', '#4F8A76', '#6FA8DC', '#9FB5AC', '#5C9EA6'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  ngOnDestroy() {
    this.householdSubscription?.unsubscribe();
  }
}

/**
 * Modal pour créer un foyer
 */
@Component({
  selector: 'app-create-household-modal',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonInput
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-title>Créer un foyer</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" color="danger" (click)="dismiss()">
            <ion-icon slot="icon-only" name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="form-field">
        <label class="field-label">Nom du foyer</label>
        <ion-input [(ngModel)]="householdName" placeholder="ex: Notre maison" fill="outline" class="custom-input"></ion-input>
      </div>

      <div class="ion-padding-top">
        <ion-button expand="block" color="primary" (click)="create()">
          Créer le foyer
        </ion-button>
        <ion-button expand="block" fill="outline" color="danger" (click)="dismiss()">
          Annuler
        </ion-button>
      </div>
    </ion-content>
  `
})
export class CreateHouseholdModalComponent {
  householdName = '';

  constructor(private modalController: ModalController) {
    addIcons({ close });
  }

  create() {
    if (this.householdName.trim()) {
      this.modalController.dismiss({ householdName: this.householdName });
    }
  }

  dismiss() {
    this.modalController.dismiss(null);
  }
}

/**
 * Modal pour rejoindre un foyer
 */
@Component({
  selector: 'app-join-household-modal',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonInput, IonLabel, IonSegment, IonSegmentButton
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-title>Rejoindre un foyer</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" color="danger" (click)="dismiss()">
            <ion-icon slot="icon-only" name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-segment [value]="joinMethod" (ionChange)="joinMethod = $any($event).detail.value">
        <ion-segment-button value="code">
          <ion-label>Code ami</ion-label>
        </ion-segment-button>
        <ion-segment-button value="link">
          <ion-label>Lien</ion-label>
        </ion-segment-button>
      </ion-segment>

      <div class="ion-padding-top">
        <div class="form-field" *ngIf="joinMethod === 'code'">
          <label class="field-label">Code ami (8 caractères)</label>
          <ion-input [(ngModel)]="inviteCode" placeholder="ex: ABC12345" fill="outline" class="custom-input"></ion-input>
        </div>

        <div class="form-field" *ngIf="joinMethod === 'link'">
          <label class="field-label">Lien d'invitation</label>
          <ion-input [(ngModel)]="inviteLink" placeholder="wevy://join/..." fill="outline" class="custom-input"></ion-input>
        </div>
      </div>

      <div class="ion-padding-top">
        <ion-button expand="block" color="primary" (click)="join()">
          Rejoindre
        </ion-button>
        <ion-button expand="block" fill="outline" color="danger" (click)="dismiss()">
          Annuler
        </ion-button>
      </div>
    </ion-content>
  `
})
export class JoinHouseholdModalComponent {
  joinMethod = 'code';
  inviteCode = '';
  inviteLink = '';

  constructor(private modalController: ModalController) {
    addIcons({ close });
  }

  join() {
    const value = this.joinMethod === 'code' ? this.inviteCode : this.inviteLink;
    if (value.trim()) {
      this.modalController.dismiss({
        [this.joinMethod === 'code' ? 'inviteCode' : 'inviteLink']: value
      });
    }
  }

  dismiss() {
    this.modalController.dismiss(null);
  }
}
