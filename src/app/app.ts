import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { DirectoryService } from './core/services/directory.service';
import { NotificationHubService } from './core/services/notification-hub.service';
import { NotificationStore } from './core/services/notification.store';
import { ThemeService } from './core/services/theme.service';
import { ConfirmHostComponent } from './shared/ui/confirm-host.component';
import { ToastHostComponent } from './shared/ui/toast-host.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastHostComponent, ConfirmHostComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet />
    <app-toast-host />
    <app-confirm-host />
  `,
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly hub = inject(NotificationHubService);
  private readonly notifications = inject(NotificationStore);
  private readonly directory = inject(DirectoryService);
  private readonly userId = computed(() => this.auth.user()?.id || null);

  constructor() {
    inject(ThemeService); // apply the saved theme immediately

    // Session lifecycle: connect real-time + warm caches on sign-in, tear down on sign-out.
    effect(() => {
      const id = this.userId();
      untracked(() => {
        if (id) {
          void this.hub.start(id);
          this.notifications.load();
          this.directory.load(true);
        } else {
          void this.hub.stop();
          this.notifications.reset();
          this.directory.reset();
        }
      });
    });
  }
}
