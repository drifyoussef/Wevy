import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { ShareIntakeService } from './services/share-intake.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor(shareIntake: ShareIntakeService) {
    // Links shared to the app / mesnia://import deep links open the recipe import
    shareIntake.init();
  }
}
