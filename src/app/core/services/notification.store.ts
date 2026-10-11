import { Injectable, computed, inject, signal } from '@angular/core';
import { NotificationApi } from '../api/misc.api';
import { AppNotification } from '../models/models';
import { NotificationHubService } from './notification-hub.service';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class NotificationStore {
  private readonly api = inject(NotificationApi);
  private readonly hub = inject(NotificationHubService);
  private readonly toast = inject(ToastService);

  readonly items = signal<AppNotification[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly unreadCount = computed(() => this.items().filter((n) => !n.isRead).length);

  constructor() {
    // Real-time push: show a toast, then pull the persisted list so ids/read-state stay authoritative.
    this.hub.received.subscribe((n) => {
      this.toast.info(n.message, n.title);
      this.load(true);
    });
  }

  load(silent = false): void {
    if (!silent) this.loading.set(true);
    this.api.mine().subscribe({
      next: (list) => {
        this.items.set([...list].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
        this.loading.set(false);
        this.loaded.set(true);
      },
      error: () => {
        this.loading.set(false);
        this.loaded.set(true);
      },
    });
  }

  reset(): void {
    this.items.set([]);
    this.loaded.set(false);
  }

  setRead(n: AppNotification, isRead: boolean): void {
    if (n.isRead === isRead) return;
    this.patch(n.id, isRead); // optimistic
    const call = isRead ? this.api.markRead(n.id) : this.api.markUnread(n.id);
    call.subscribe({
      error: (e) => {
        this.patch(n.id, !isRead);
        this.toast.fromError(e);
      },
    });
  }

  markAllRead(): void {
    this.items().filter((n) => !n.isRead).forEach((n) => this.setRead(n, true));
  }

  private patch(id: string, isRead: boolean): void {
    this.items.update((list) => list.map((n) => (n.id === id ? { ...n, isRead } : n)));
  }
}
