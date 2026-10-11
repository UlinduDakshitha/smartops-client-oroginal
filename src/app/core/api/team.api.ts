import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Team, TeamInput, User } from '../models/models';

type Msg = { message: string };

@Injectable({ providedIn: 'root' })
export class TeamApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/team`;

  list(): Observable<Team[]> { return this.http.get<Team[]>(this.base); }
  get(id: string): Observable<Team> { return this.http.get<Team>(`${this.base}/${id}`); }
  create(input: TeamInput): Observable<Team> { return this.http.post<Team>(this.base, input); }
  update(id: string, input: TeamInput): Observable<Team> { return this.http.put<Team>(`${this.base}/${id}`, input); }

  members(teamId: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.base}/${teamId}/members`);
  }
  addMember(teamId: string, userId: string): Observable<Msg> {
    return this.http.post<Msg>(`${this.base}/${teamId}/members`, { userId });
  }
  removeMember(teamId: string, userId: string): Observable<Msg> {
    return this.http.delete<Msg>(`${this.base}/${teamId}/members/${userId}`);
  }
  assignLead(teamId: string, userId: string): Observable<Msg> {
    return this.http.patch<Msg>(`${this.base}/${teamId}/lead/${userId}`, {});
  }
  removeLead(teamId: string): Observable<Msg> {
    return this.http.delete<Msg>(`${this.base}/${teamId}/lead`);
  }
}
