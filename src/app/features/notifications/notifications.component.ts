import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ACCESS, AppNotification } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { NotificationStore } from '../../core/services/notification.store';
import { DateTimePipe, RelativeTimePipe } from '../../shared/pipes/format.pipes';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { incidentNumberOf, notificationIcon } from './notification-meta';

@Component({
  selector: 'app-notifications',
  imports: [IconComponent, EmptyStateComponent, RelativeTimePipe, DateTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
    }

    .notifications-page {
      max-width: 100%;
      padding: 24px 32px 56px;
    }

    /* Head */
    .title-cluster {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .title-cluster h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 750;
      letter-spacing: -0.02em;
      color: var(--text);
    }
    .total-tag {
      font-size: 12px;
      font-weight: 600;
      padding: 2px 9px;
      border-radius: 999px;
      background: var(--sunken);
      color: var(--text-2);
      font-variant-numeric: tabular-nums;
    }
    .unread-pill {
      font-size: 12px;
      font-weight: 650;
      padding: 2px 9px;
      border-radius: 999px;
      background: var(--brand-soft);
      color: var(--brand-ink);
      border: 1px solid color-mix(in srgb, var(--brand) 25%, transparent);
      font-variant-numeric: tabular-nums;
    }
    .subtitle {
      margin: 4px 0 0;
      font-size: 13.5px;
      color: var(--text-2);
    }

    /* Workspace - cardless, flat canvas flow */
    .notifications-workspace {
      display: flex;
      flex-direction: column;
      margin-top: 18px;
    }

    /* Filter Toolbar */
    .filter-toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 0 16px;
      border-bottom: 1px solid var(--line);
    }
    .tab-ribbon {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tab-chip {
      display: inline-flex;
      align-items: center;
      height: 32px;
      padding: 0 14px;
      border-radius: 999px;
      border: 1px solid var(--line-2);
      background: var(--surface);
      color: var(--text-2);
      font-size: 12.5px;
      font-weight: 550;
      cursor: pointer;
      user-select: none;
      transition: all 0.12s ease;
    }
    .tab-chip:hover {
      background: var(--sunken);
      color: var(--text);
    }
    .tab-chip.active {
      background: var(--brand);
      border-color: var(--brand);
      color: var(--on-brand);
      font-weight: 600;
    }

    /* Notification Items - open, cardless list */
    .notification-list {
      display: flex;
      flex-direction: column;
    }
    .item {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      padding: 16px 12px;
      border-bottom: 1px solid var(--line);
      border-radius: var(--r-md);
      transition: background-color 0.12s ease;
    }
    .item:hover {
      background: color-mix(in srgb, var(--brand) 3%, transparent);
    }
    .item.unread {
      background: color-mix(in srgb, var(--brand) 4%, transparent);
    }
    .item.unread:hover {
      background: color-mix(in srgb, var(--brand) 7%, transparent);
    }

    .ico-wrap {
      flex-shrink: 0;
      padding-top: 2px;
    }
    .ico {
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      border-radius: 9px;
      background: var(--sunken);
      color: var(--text-2);
      transition: all 0.12s ease;
    }
    .unread .ico {
      background: var(--brand-soft);
      color: var(--brand-ink);
      border: 1px solid color-mix(in srgb, var(--brand) 22%, transparent);
    }

    .body {
      flex: 1;
      min-width: 0;
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .unread-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--brand);
      flex-shrink: 0;
    }
    .title-text {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
    }
    .unread .title-text {
      font-weight: 700;
    }
    .time-stamp {
      font-size: 12px;
      color: var(--text-3);
      margin-left: auto;
      font-variant-numeric: tabular-nums;
    }
    .message-text {
      margin-top: 4px;
      font-size: 13.5px;
      color: var(--text-2);
      line-height: 1.45;
      overflow-wrap: anywhere;
    }

    .acts {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-shrink: 0;
      padding-top: 2px;
    }

    .empty-wrap {
      padding: 32px 0;
    }
    .skeleton-item {
      display: flex;
      gap: 16px;
      align-items: center;
      padding: 16px 12px;
      border-bottom: 1px solid var(--line);
    }

    @media (max-width: 768px) {
      .notifications-page {
        padding: 16px 16px 40px;
      }
      .item {
        flex-direction: column;
        gap: 12px;
      }
      .acts {
        align-self: flex-start;
        margin-top: 4px;
      }
      .time-stamp {
        margin-left: 0;
        width: 100%;
      }
    }
  `,
  template: `
    <div class="notifications-page">
      <div class="page-head">
        <div>
          <div class="title-cluster">
            <h1>Notifications</h1>
            <span class="total-tag">{{ store.items().length }} total</span>
            @if (store.unreadCount() > 0) {
              <span class="unread-pill">{{ store.unreadCount() }} unread</span>
            }
          </div>
          <p class="subtitle">Operational assignments, state updates, and incident activity.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn" (click)="store.load()" [disabled]="store.loading()">
            <app-icon name="refresh" /> Refresh
          </button>
          <button type="button" class="btn" [disabled]="store.unreadCount() === 0" (click)="store.markAllRead()">
            <app-icon name="check" /> Mark all as read
          </button>
        </div>
      </div>

      <div class="notifications-workspace">
        <div class="filter-toolbar">
          <div class="tab-ribbon" role="group" aria-label="Filter notifications">
            <button
              type="button"
              class="tab-chip"
              [class.active]="!onlyUnread()"
              (click)="onlyUnread.set(false)"
            >
              All ({{ store.items().length }})
            </button>
            <button
              type="button"
              class="tab-chip"
              [class.active]="onlyUnread()"
              (click)="onlyUnread.set(true)"
            >
              Unread ({{ store.unreadCount() }})
            </button>
          </div>
        </div>

        <div class="notification-list">
          @if (store.loading() && !store.loaded()) {
            @for (n of [1,2,3,4]; track n) {
              <div class="skeleton-item">
                <span class="skeleton" style="width:38px; height:38px; border-radius:9px; flex-shrink:0;"></span>
                <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
                  <span class="skeleton" style="width:35%; height:16px;"></span>
                  <span class="skeleton" style="width:70%; height:14px;"></span>
                </div>
              </div>
            }
          } @else {
            @for (n of visible(); track n.id) {
              <div class="item" [class.unread]="!n.isRead">
                <div class="ico-wrap">
                  <span class="ico">
                    <app-icon [name]="icon(n)" [size]="18" />
                  </span>
                </div>
                <div class="body">
                  <div class="title-row">
                    @if (!n.isRead) {
                      <span class="unread-dot" title="Unread notification"></span>
                    }
                    <span class="title-text">{{ n.title }}</span>
                    <span class="time-stamp" [title]="n.createdAt | dt">{{ n.createdAt | rel }}</span>
                  </div>
                  <div class="message-text">{{ n.message }}</div>
                </div>
                <div class="acts">
                  @if (canOpen(n)) {
                    <button type="button" class="btn btn-sm" (click)="open(n)">
                      View incident
                    </button>
                  }
                  <button
                    type="button"
                    class="btn btn-sm btn-quiet"
                    (click)="store.setRead(n, !n.isRead)"
                  >
                    {{ n.isRead ? 'Mark as unread' : 'Mark as read' }}
                  </button>
                </div>
              </div>
            } @empty {
              <div class="empty-wrap">
                <app-empty-state
                  icon="bell"
                  [title]="onlyUnread() ? 'No unread notifications' : 'Nothing here yet'"
                  [message]="onlyUnread() ? 'You have caught up with all notifications.' : 'You will be notified when an incident is assigned to you or changes state.'"
                />
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class NotificationsComponent {
  protected readonly store = inject(NotificationStore);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  protected readonly onlyUnread = signal(false);
  protected readonly visible = computed(() => (this.onlyUnread() ? this.store.items().filter((n) => !n.isRead) : this.store.items()));
  protected icon = (n: AppNotification) => notificationIcon(n.type);

  constructor() {
    this.store.load(this.store.loaded());
  }

  protected canOpen(n: AppNotification): boolean {
    return !!incidentNumberOf(n.message) && this.auth.hasAnyRole(ACCESS.incidents);
  }

  protected open(n: AppNotification): void {
    this.store.setRead(n, true);
    void this.router.navigate(['/incidents'], { queryParams: { q: incidentNumberOf(n.message) } });
  }
}
