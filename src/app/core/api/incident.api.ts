import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AssignInput,
  Incident,
  IncidentComment,
  IncidentFilter,
  IncidentHistoryEntry,
  IncidentInput,
  IncidentPage,
  IncidentStatus,
  Priority,
  ResolveInput,
  Severity,
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class IncidentApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/incident`;

  /** Server-side filtered + paged list. Filters are sent as enum names, which the API parses. */
  paged(page: number, size: number, filter: IncidentFilter = {}): Observable<IncidentPage> {
    let params = new HttpParams().set('pageNumber', page).set('pageSize', size);
    if (filter.status != null) params = params.set('status', IncidentStatus[filter.status]);
    if (filter.priority != null) params = params.set('priority', Priority[filter.priority]);
    if (filter.severity != null) params = params.set('severity', Severity[filter.severity]);
    return this.http.get<IncidentPage>(`${this.base}/paged`, { params });
  }

  all(): Observable<Incident[]> {
    return this.http.get<Incident[]>(this.base);
  }

  get(id: string): Observable<Incident> {
    return this.http.get<Incident>(`${this.base}/${id}`);
  }

  create(input: IncidentInput): Observable<Incident> {
    return this.http.post<Incident>(this.base, input);
  }

  update(id: string, input: IncidentInput): Observable<Incident> {
    return this.http.put<Incident>(`${this.base}/${id}`, input);
  }

  assign(id: string, input: AssignInput): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/assign`, input);
  }

  start(id: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/${id}/start`, {});
  }

  resolve(id: string, input: ResolveInput): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/resolve`, input);
  }

  close(id: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/${id}/close`, {});
  }

  cancel(id: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/${id}/cancel`, {});
  }

  addComment(id: string, comment: string): Observable<IncidentComment> {
    return this.http.post<IncidentComment>(`${this.base}/${id}/comments`, { comment });
  }

  /** Only used when environment.features.incidentCommentsList is enabled (needs a GET endpoint on the API). */
  comments(id: string): Observable<IncidentComment[]> {
    return this.http.get<IncidentComment[]>(`${this.base}/${id}/comments`);
  }

  history(id: string): Observable<IncidentHistoryEntry[]> {
    return this.http.get<IncidentHistoryEntry[]>(`${environment.apiUrl}/incidenthistory/incident/${id}`);
  }
}
