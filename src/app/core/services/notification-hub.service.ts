import { Injectable, inject, signal } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HubNotification } from '../models/models';
import { AuthService } from './auth.service';

export type HubStatus = 'offline' | 'connecting' | 'live' | 'reconnecting';

/** Wraps the SignalR connection to /hubs/notifications (server event: "ReceiveNotification"). */
@Injectable({ providedIn: 'root' })
export class NotificationHubService {
  private readonly auth = inject(AuthService);
  private connection: HubConnection | null = null;
  private userId: string | null = null;

  readonly status = signal<HubStatus>('offline');
  readonly received = new Subject<HubNotification>();

  async start(userId: string): Promise<void> {
    if (this.connection && this.userId === userId) return;
    await this.stop();
    this.userId = userId;

    const connection = new HubConnectionBuilder()
      .withUrl(environment.hubUrl, { accessTokenFactory: () => this.auth.freshAccessToken() })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 20000, 30000])
      .configureLogging(environment.production ? LogLevel.Error : LogLevel.Warning)
      .build();

    connection.on('ReceiveNotification', (payload: HubNotification) => this.received.next(payload));
    connection.onreconnecting(() => this.status.set('reconnecting'));
    connection.onreconnected(async () => {
      await this.joinGroup(connection, userId);
      this.status.set('live');
    });
    connection.onclose(() => {
      if (this.connection === connection) this.status.set('offline');
    });

    this.connection = connection;
    this.status.set('connecting');
    try {
      await connection.start();
      await this.joinGroup(connection, userId);
      this.status.set('live');
    } catch {
      // Not fatal: the notification list still works over REST. Retry once in a while.
      this.status.set('offline');
      setTimeout(() => {
        if (this.connection === connection && connection.state === HubConnectionState.Disconnected) {
          this.connection = null;
          void this.start(userId);
        }
      }, 15_000);
    }
  }

  async stop(): Promise<void> {
    const c = this.connection;
    this.connection = null;
    this.userId = null;
    this.status.set('offline');
    if (c) {
      try { await c.stop(); } catch { /* already stopped */ }
    }
  }

  private async joinGroup(connection: HubConnection, userId: string): Promise<void> {
    try {
      await connection.invoke('JoinUserGroup', userId);
    } catch {
      /* the server rejects ids that are not the caller's */
    }
  }
}
