import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateUserInput, Role, UpdateUserInput, User, UserList } from '../models/models';

type Msg = { message?: string; Message?: string };

@Injectable({ providedIn: 'root' })
export class UserApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/user`;

  list(): Observable<UserList> { return this.http.get<UserList>(this.base); }
  get(id: string): Observable<User> { return this.http.get<User>(`${this.base}/${id}`); }
  create(input: CreateUserInput): Observable<User> { return this.http.post<User>(this.base, input); }
  update(id: string, input: UpdateUserInput): Observable<User> { return this.http.put<User>(`${this.base}/${id}`, input); }
  activate(id: string): Observable<Msg> { return this.http.patch<Msg>(`${this.base}/${id}/activate`, {}); }
  deactivate(id: string): Observable<Msg> { return this.http.patch<Msg>(`${this.base}/${id}/deactivate`, {}); }
  roles(id: string): Observable<Role[]> { return this.http.get<Role[]>(`${this.base}/${id}/roles`); }
  assignRole(id: string, roleId: string): Observable<Msg> {
    return this.http.post<Msg>(`${this.base}/${id}/roles/${roleId}`, {});
  }
}
