import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from '../models/models';

/** Turns whatever the API (or the network) throws into a short, user-readable message. */
export function toApiError(err: unknown): ApiError {
  if (!(err instanceof HttpErrorResponse)) {
    const message = err instanceof Error ? err.message : 'Something went wrong.';
    return { status: -1, message };
  }
  const body = err.error as Record<string, unknown> | string | null;

  if (err.status === 0) {
    return { status: 0, message: 'Cannot reach the SmartOps API. Check that the server is running.' };
  }
  if (err.status === 429) {
    return { status: 429, message: 'Too many requests. Wait a moment and try again.' };
  }
  if (body && typeof body === 'object') {
    // Shape produced by ExceptionHandlingMiddleware: { statusCode, message, timestamp }
    if (typeof body['message'] === 'string' && body['message']) {
      return { status: err.status, message: body['message'] };
    }
    // ASP.NET ProblemDetails / model validation: { title, errors: { Field: [msg] } }
    const errors = body['errors'];
    if (errors && typeof errors === 'object') {
      const first = Object.values(errors as Record<string, string[]>)[0];
      if (Array.isArray(first) && first[0]) return { status: err.status, message: first[0] };
    }
    if (typeof body['title'] === 'string') return { status: err.status, message: body['title'] };
  }
  if (typeof body === 'string' && body.trim() && body.length < 200) {
    return { status: err.status, message: body };
  }
  switch (err.status) {
    case 401:
      return { status: 401, message: 'Your session has expired. Please sign in again.' };
    case 403:
      return { status: 403, message: 'You do not have permission to do that.' };
    case 404:
      return { status: 404, message: 'The requested item was not found.' };
    default:
      return { status: err.status, message: err.status >= 500 ? 'The server hit an unexpected error.' : 'The request could not be completed.' };
  }
}
