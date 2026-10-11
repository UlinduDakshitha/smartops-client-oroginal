import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

const PUBLIC_AUTH_CALLS = /\/auth\/(login|register|refresh)$/;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  if (!req.url.startsWith(environment.apiUrl)) return next(req);

  const isPublic = PUBLIC_AUTH_CALLS.test(req.url);
  const withToken = (r: HttpRequest<unknown>) => {
    const token = auth.accessToken();
    return token && !isPublic ? r.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : r;
  };

  return next(withToken(req)).pipe(
    catchError((err: unknown) => {
      const expired = err instanceof HttpErrorResponse && err.status === 401;
      if (!expired || isPublic || !auth.refreshToken()) return throwError(() => err);

      // Access token expired: rotate it once, then replay the original request.
      return auth.refresh().pipe(
        switchMap(() => next(withToken(req))),
        catchError((refreshErr: unknown) => {
          if (refreshErr instanceof HttpErrorResponse && (refreshErr.status === 401 || refreshErr.status === 403)) {
            auth.expireSession();
          }
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};
