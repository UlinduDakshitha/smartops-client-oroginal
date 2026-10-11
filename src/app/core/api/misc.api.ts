import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AppNotification,
  AuditLog,
  DashboardSummary,
  MonthlyTrend,
  Role,
  SlaPolicy,
  SlaPolicyInput,
  TeamWorkload,
} from '../models/models';

const api = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class RoleApi {
  private readonly http = inject(HttpClient);
  list(): Observable<Role[]> { return this.http.get<Role[]>(`${api}/role`); }
}

@Injectable({ providedIn: 'root' })
export class SlaApi {
  private readonly http = inject(HttpClient);
  list(): Observable<SlaPolicy[]> { return this.http.get<SlaPolicy[]>(`${api}/slapolicy`); }
  create(input: SlaPolicyInput): Observable<SlaPolicy> { return this.http.post<SlaPolicy>(`${api}/slapolicy`, input); }
  update(id: string, input: SlaPolicyInput): Observable<SlaPolicy> {
    return this.http.put<SlaPolicy>(`${api}/slapolicy/${id}`, input);
  }
}

@Injectable({ providedIn: 'root' })
export class DashboardApi {
  private readonly http = inject(HttpClient);
  summary(): Observable<DashboardSummary> { return this.http.get<DashboardSummary>(`${api}/dashboard/summary`); }
  monthlyTrend(): Observable<MonthlyTrend[]> { return this.http.get<MonthlyTrend[]>(`${api}/dashboard/monthly-trend`); }
  teamWorkload(): Observable<TeamWorkload[]> { return this.http.get<TeamWorkload[]>(`${api}/dashboard/team-workload`); }
}

@Injectable({ providedIn: 'root' })
export class NotificationApi {
  private readonly http = inject(HttpClient);
  mine(): Observable<AppNotification[]> { return this.http.get<AppNotification[]>(`${api}/notification`); }
  markRead(id: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${api}/notification/${id}/read`, {});
  }
  markUnread(id: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${api}/notification/${id}/unread`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class AuditApi {
  private readonly http = inject(HttpClient);
  all(): Observable<AuditLog[]> { return this.http.get<AuditLog[]>(`${api}/auditlog`); }
  mine(): Observable<AuditLog[]> { return this.http.get<AuditLog[]>(`${api}/auditlog/my`); }
}
