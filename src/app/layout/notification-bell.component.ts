import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ACCESS, AppNotification } from '../core/models/models';
import { AuthService } from '../core/services/auth.service';
import { NotificationStore } from '../core/services/notification.store';
import { RelativeTimePipe } from '../shared/pipes/format.pipes';
import { IconComponent } from '../shared/ui/icon.component';
import { notificationIcon, incidentNumberOf } from '../features/notifications/notification-meta';

@Component({
  selector: 'app-notification-bell',
  imports: [IconComponent, RouterLink, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { position: relative; display: inline-block; }
    .trigger { position: relative; }
    .count { position: absolute; top: 2px; right: 1px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px;
      background: var(--danger); color: #fff; font-size: 10.5px; font-weight: 700; line-height: 16px; text-align: center; }
    .panel-pop { position: absolute; right: 0; top: calc(100% + 8px); width: 380px; max-width: calc(100vw - 24px); z-index: 60;
      background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--shadow-pop); overflow: hidden; }
    .head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--line); }
    .list { max-height: 380px; overflow-y: auto; }
    .item { display: flex; gap: 12px; width: 100%; padding: 12px 16px; border: 0; background: none; text-align: left; border-bottom: 1px solid var(--line); }
    .item:hover { background: var(--surface-2); }
    .item:last-child { border-bottom: 0; }
    .ico { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: var(--sunken); color: var(--text-2); flex: none; }
    .unread .ico { background: var(--brand-soft); color: var(--brand-ink); }
    .t { font-weight: 560; } .unread .t { font-weight: 700; }
    .m { color: var(--text-2); font-size: 13px; overflow-wrap: anywhere; }
    .w { color: var(--text-3); font-size: 12px; margin-top: 2px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--brand); margin-top: 6px; flex: none; }
    .foot { display: flex; justify-content: space-between; padding: 10px 16px; border-top: 1px solid var(--line); background: var(--surface-2); }
    .empty { padding: 32px 16px; text-align: center; color: var(--text-2); }
  `,
  template: `
    <button type="button" class="btn btn-quiet btn-icon trigger" aria-haspopup="true" [attr.aria-expanded]="open()"
      [attr.aria-label]="'Notifications' + (store.unreadCount() ? ', ' + store.unreadCount() + ' unread' : '')" (click)="toggle()">
      <app-icon name="bell" [size]="18" />
      @if (store.unreadCount() > 0) { <span class="count">{{ store.unreadCount() > 9 ? '9+' : store.unreadCount() }}</span> }
    </button>

    @if (open()) {
      <div class="panel-pop" role="dialog" aria-label="Notifications">
        <div class="head">
          <h3>Notifications</h3>
          <button type="button" class="btn btn-quiet btn-sm" [disabled]="store.unreadCount() === 0" (click)="store.markAllRead()">Mark all as read</button>
        </div>
        <div class="list">
          @for (n of latest(); track n.id) {
            <button type="button" class="item" [class.unread]="!n.isRead" (click)="openItem(n)">
              <span class="ico"><app-icon [name]="icon(n)" /></span>
              <span style="flex:1;min-width:0">
                <div class="t">{{ n.title }}</div>
                <div class="m">{{ n.message }}</div>
                <div class="w">{{ n.createdAt | rel }}</div>
              </span>
              @if (!n.isRead) { <span class="dot" aria-label="Unread"></span> }
            </button>
          } @empty {
            <div class="empty">You are all caught up.</div>
          }
        </div>
        <div class="foot">
          <a routerLink="/notifications" (click)="open.set(false)">View all notifications</a>
        </div>
      </div>
    }
  `,
})
export class NotificationBellComponent {
  protected readonly store = inject(NotificationStore);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly open = signal(false);
  protected readonly latest = computed(() => this.store.items().slice(0, 6));

  protected icon = (n: AppNotification) => notificationIcon(n.type);

  protected toggle(): void {
    this.open.update((v) => !v);
  }

  protected openItem(n: AppNotification): void {
    this.store.setRead(n, true);
    this.open.set(false);
    const number = incidentNumberOf(n.message);
    if (number && this.auth.hasAnyRole(ACCESS.incidents)) {
      void this.router.navigate(['/incidents'], { queryParams: { q: number } });
    }
  }

  @HostListener('document:mousedown', ['$event'])
  protected onOutside(e: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.open.set(false);
  }
}
