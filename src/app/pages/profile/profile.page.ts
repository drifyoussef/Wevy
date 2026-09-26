import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonButton,
  IonButtons, IonBackButton,
  ModalController, AlertController, IonSegment, IonSegmentButton, IonInput, IonLabel, IonSpinner
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  homeOutline, home, cloudOfflineOutline, addOutline, keyOutline, chevronForward, close, copyOutline,
  checkmark, linkOutline, shareSocialOutline, refreshOutline, personRemoveOutline, exitOutline
} from 'ionicons/icons';
import { HouseholdService, HouseholdLoadState } from '../../services/household.service';
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
    IonHeader, IonToolbar, IonTitle, IonContent, IonIcon,
    IonButtons, IonBackButton, IonSpinner
  ]
})
export class ProfilePage implements OnInit, OnDestroy {
  household: Household | null = null;
  members: HouseholdMember[] = [];
  currentUserId: string | null = null;
  inviteLink = '';
  inviteCode = '';
  copiedLink = false;
  copiedCode = false;
  loadState: HouseholdLoadState = 'loading';
  private subscriptions = new Subscription();

  constructor(
    private householdService: HouseholdService,
    private authService: AuthService,
    private modalController: ModalController,
    private alertController: AlertController,
    private toastService: ToastService
  ) {
    addIcons({
      homeOutline, home, cloudOfflineOutline, addOutline, keyOutline, chevronForward, close, copyOutline,
      checkmark, linkOutline, shareSocialOutline, refreshOutline, personRemoveOutline, exitOutline
    });
  }

  ngOnInit() {
    // Followed rather than read once: right after a refresh the user isn't loaded yet
    this.subscriptions.add(
      this.authService.currentUser$.subscribe(user => this.currentUserId = user?.id || null)
    );

    this.subscriptions.add(
      this.householdService.loadState$.subscribe(state => this.loadState = state)
    );

    this.subscriptions.add(
      this.householdService.getCurrentHousehold$().subscribe(household => {
        this.household = household;
        this.members = household?.members || [];
        if (household) {
          this.inviteLink = household.inviteLink;
          this.inviteCode = household.inviteCode;
        }
      })
    );
  }

  retryLoad() {
    this.householdService.reload();
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

    const confirmed = await this.confirm(
      'Nouveau code ?',
      "L'ancien code et l'ancien lien ne fonctionneront plus.",
      'Générer'
    );
    if (!confirmed) return;

    try {
      const result = await this.householdService.regenerateInviteLink(this.household.id);
      this.inviteLink = result.link;
      this.inviteCode = result.code;
      this.toastService.success('Nouveau code généré');
    } catch (error) {
      console.error('Error regenerating invite:', error);
      this.toastService.error('Impossible de générer un nouveau code');
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
    }).catch(() => this.toastService.error('Impossible de copier'));
  }

  shareLink() {
    // No share sheet (desktop browsers): copying is the next best thing
    if (!navigator.share) {
      this.copyToClipboard(this.inviteLink, 'link');
      this.toastService.success('Lien copié');
      return;
    }

    navigator.share({
      title: 'Rejoins mon foyer sur Wevy',
      text: `Rejoins mon foyer avec ce lien : ${this.inviteLink}`,
      url: this.inviteLink
    }).catch(err => console.log('Error sharing:', err));
  }

  async removeMember(member: HouseholdMember) {
    if (!this.household) return;

    const confirmed = await this.confirm(
      `Retirer ${member.displayName} ?`,
      "Cette personne n'aura plus accès au foyer.",
      'Retirer'
    );
    if (!confirmed) return;

    try {
      await this.householdService.removeMember(this.household.id, member.userId);
      this.toastService.success(`${member.displayName} a été retiré du foyer`);
    } catch (error) {
      console.error('Error removing member:', error);
      this.toastService.error('Impossible de retirer ce membre');
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

    // The backend deletes the whole household when its creator (or last member) leaves
    const deletesHousehold = this.household.createdBy === this.currentUserId || this.members.length === 1;
    const others = this.members.length - 1;
    const message = !deletesHousehold
      ? "Tu n'auras plus accès aux tâches, courses et au calendrier du foyer."
      : others > 0
        ? `Tu as créé ce foyer : le quitter le supprimera définitivement pour les ${others} autre${others > 1 ? 's' : ''} membre${others > 1 ? 's' : ''}.`
        : 'Tu es le seul membre : le foyer sera supprimé définitivement.';

    const confirmed = await this.confirm(
      deletesHousehold ? 'Supprimer le foyer ?' : 'Quitter le foyer ?',
      message,
      deletesHousehold ? 'Supprimer' : 'Quitter'
    );
    if (!confirmed) return;

    try {
      await this.householdService.leaveHousehold(this.household.id, this.currentUserId);
      this.toastService.success(deletesHousehold ? 'Foyer supprimé' : 'Tu as quitté le foyer');
    } catch (error) {
      console.error('Error leaving household:', error);
      this.toastService.error('Impossible de quitter le foyer');
    }
  }

  /** Native-looking confirmation dialog with a red action button. */
  private async confirm(header: string, message: string, confirmText: string): Promise<boolean> {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        { text: confirmText, role: 'destructive' }
      ]
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'destructive';
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

  getAvatarColor(name: string): string {
    const colors = ['#74B39D', '#4F8A76', '#6FA8DC', '#9FB5AC', '#5C9EA6'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
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
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonIcon, IonInput
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
      <ion-input [(ngModel)]="householdName" label="Nom du foyer" labelPlacement="stacked" placeholder="ex: Notre maison" fill="outline" class="custom-input"></ion-input>

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
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonIcon, IonInput, IonLabel, IonSegment, IonSegmentButton
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
        @if (joinMethod === 'code') {
          <ion-input [(ngModel)]="inviteCode" label="Code ami (8 caractères)" labelPlacement="stacked" placeholder="ex: ABC12345" fill="outline" class="custom-input"></ion-input>
        } @else {
          <ion-input [(ngModel)]="inviteLink" label="Lien d'invitation" labelPlacement="stacked" placeholder="wevy://join/..." fill="outline" class="custom-input"></ion-input>
        }
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
