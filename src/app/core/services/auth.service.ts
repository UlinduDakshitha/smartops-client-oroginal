import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ACCESS,
  AuthUser,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ROLE,
} from '../models/models';
import { claimEmail, claimExpiryMs, claimId, claimRoles, decodeJwt } from '../util/jwt';

interface Session {
  accessToken: string;
  refreshToken: string;
}

const STORAGE_KEY = 'smartops.session';
const JSON_HEADERS = new HttpHeaders({ 'Content-Type': 'application/json' });

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = `${environment.apiUrl}/auth`;

  private readonly _session = signal<Session | null>(this.restore());
  private refreshInFlight$: Observable<Session> | null = null;

  readonly isAuthenticated = computed(() => this._session() !== null);
  readonly accessToken = computed(() => this._session()?.accessToken ?? null);
  readonly refreshToken = computed(() => this._session()?.refreshToken ?? null);

  readonly user = computed<AuthUser | null>(() => {
    const s = this._session();
    if (!s) return null;
    const payload = decodeJwt(s.accessToken);
    return { id: claimId(payload), email: claimEmail(payload), roles: claimRoles(payload) };
  });

  readonly roles = computed(() => this.user()?.roles ?? []);

  hasAnyRole(roles: readonly string[]): boolean {
    const mine = this.roles();
    return roles.some((r) => mine.includes(r));
  }

  /** Where a freshly signed-in user should land, based on what their roles can open. */
  homeRoute(): string {
    if (this.hasAnyRole(ACCESS.dashboard)) return '/dashboard';
    if (this.hasAnyRole(ACCESS.incidents)) return '/incidents';
    return '/notifications';
  }

  isAdmin(): boolean {
    return this.roles().includes(ROLE.Administrator);
  }

  // ---- API calls ----------------------------------------------------------

  login(request: LoginRequest, remember: boolean): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/login`, request).pipe(
      tap((res) => this.persist({ accessToken: res.accessToken, refreshToken: res.refreshToken }, remember)),
    );
  }

  register(request: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.base}/register`, request);
  }

  /** Single-flight refresh: concurrent callers share one network request. */
  refresh(): Observable<Session> {
    const current = this._session();
    if (!current) return throwError(() => new Error('No session.'));
    if (!this.refreshInFlight$) {
      // The endpoint takes a bare JSON string: [FromBody] string refreshToken
      this.refreshInFlight$ = this.http
        .post<LoginResponse>(`${this.base}/refresh`, JSON.stringify(current.refreshToken), { headers: JSON_HEADERS })
        .pipe(
          map((res) => ({ accessToken: res.accessToken, refreshToken: res.refreshToken })),
          tap((s) => this.persist(s)),
          finalize(() => (this.refreshInFlight$ = null)),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }
    return this.refreshInFlight$;
  }

  /** Resolves with a token that is valid for at least the next minute (used by SignalR). */
  async freshAccessToken(): Promise<string> {
    const s = this._session();
    if (!s) return '';
    const expiresIn = claimExpiryMs(decodeJwt(s.accessToken)) - Date.now();
    if (expiresIn > 60_000) return s.accessToken;
    return new Promise<string>((resolve) => {
      this.refresh().subscribe({
        next: (r) => resolve(r.accessToken),
        error: () => resolve(s.accessToken),
      });
    });
  }

  logout(): void {
    const token = this._session()?.refreshToken;
    const done = () => {
      this.clear();
      void this.router.navigate(['/login']);
    };
    if (!token) return done();
    this.http
      .post(`${this.base}/logout`, JSON.stringify(token), { headers: JSON_HEADERS })
      .pipe(catchError(() => of(null)))
      .subscribe(done);
  }

  /** Called when the refresh token is rejected: drop the session and go to sign-in. */
  expireSession(): void {
    if (!this._session()) return;
    this.clear();
    void this.router.navigate(['/login'], { queryParams: { expired: 1 } });
  }

  // ---- storage ------------------------------------------------------------

  private persist(session: Session, remember?: boolean): void {
    const useLocal = remember ?? localStorage.getItem(STORAGE_KEY) !== null;
    const target = useLocal ? localStorage : sessionStorage;
    const other = useLocal ? sessionStorage : localStorage;
    other.removeItem(STORAGE_KEY);
    target.setItem(STORAGE_KEY, JSON.stringify(session));
    this._session.set(session);
  }

  private clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    this._session.set(null);
  }

  private restore(): Session | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as Session;
      return s.accessToken && s.refreshToken ? s : null;
    } catch {
      return null;
    }
  }
}
