import { Injectable, signal } from '@angular/core';
import { toApiError } from '../util/errors';

export type ToastKind = 'success' | 'error' | 'info';
export interface Toast { id: number; kind: ToastKind; message: string; title?: string }

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  readonly toasts = signal<Toast[]>([]);

  success(message: string, title?: string): void { this.push('success', message, title, 4000); }
  info(message: string, title?: string): void { this.push('info', message, title, 6000); }
  error(message: string, title?: string): void { this.push('error', message, title, 8000); }
  /** Accepts whatever a failed HTTP call produced. */
  fromError(err: unknown, title?: string): void { this.error(toApiError(err).message, title); }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private push(kind: ToastKind, message: string, title: string | undefined, ttl: number): void {
    const id = ++this.seq;
    this.toasts.update((list) => [...list.slice(-3), { id, kind, message, title }]);
    setTimeout(() => this.dismiss(id), ttl);
  }
}
