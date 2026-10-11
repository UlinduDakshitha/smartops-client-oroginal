import { Injectable, signal } from '@angular/core';

/** A shared "now" that ticks every 15s so SLA countdowns stay live without per-component timers. */
@Injectable({ providedIn: 'root' })
export class ClockService {
  readonly now = signal(Date.now());
  constructor() {
    setInterval(() => this.now.set(Date.now()), 15_000);
  }
}
