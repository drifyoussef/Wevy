import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

/**
 * Single entry point for recipes coming from outside the app:
 * - deep links: mesnia://import?url=<encoded link> (old wevy:// links still work)
 * - the phone's share sheet (TikTok / Instagram / Safari "Share" -> Mesnia): the native share plugin
 *   only has to call handleIncoming() with what it received (see PARTAGE-VERS-MESNIA.md).
 * Either way the add-recipe page opens and starts the AI import on its own.
 */
@Injectable({
  providedIn: 'root'
})
export class ShareIntakeService {
  private started = false;

  constructor(private router: Router, private zone: NgZone) {}

  init() {
    if (this.started || !Capacitor.isNativePlatform()) return;
    this.started = true;

    App.addListener('appUrlOpen', ({ url }) => {
      // Native callbacks run outside Angular: bring navigation back in
      this.zone.run(() => this.handleIncoming(url));
    });
  }

  /** Accepts a deep link, a bare URL, or shared text such as "Look at this! https://vm.tiktok.com/xyz". */
  handleIncoming(text: string | null | undefined): boolean {
    const link = this.extractRecipeLink(text || '');
    if (!link) return false;

    this.router.navigate(['/tabs/add-recipe'], { queryParams: { url: link } });
    return true;
  }

  private extractRecipeLink(text: string): string | null {
    const trimmed = text.trim();

    if (/^(mesnia|wevy):\/\//i.test(trimmed)) {
      try {
        return new URL(trimmed).searchParams.get('url');
      } catch {
        return null;
      }
    }

    return trimmed.match(/https?:\/\/[^\s"'<>]+/i)?.[0] ?? null;
  }
}
