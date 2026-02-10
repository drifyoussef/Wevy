import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { notifications, people, settings, add } from 'ionicons/icons';
import { HouseholdMember } from '../../models/user.model';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonIcon
  ]
})
export class ProfilePage implements OnInit {
  members: HouseholdMember[] = [
    {
      userId: '1',
      displayName: 'Laura',
      role: 'member',
      joinedAt: new Date()
    },
  ];

  constructor() {
    addIcons({ notifications, people, settings, add });
  }

  ngOnInit() {
    console.log('Profile loaded with', this.members.length, 'members');
  }

  getAvatarColor(name: string): string {
    const colors = ['#FFB088', '#FF8B94', '#FFC75F', '#A8D5BA', '#F9AF9F'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }
}
