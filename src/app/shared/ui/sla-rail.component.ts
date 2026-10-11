import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ClockService } from '../../core/services/clock.service';
import { formatMs } from '../../core/util/dates';
import { parseUtc } from '../../core/util/dates';

type RailState = 'ok' | 'risk' | 'breach' | 'met' | 'late' | 'none';
const AT_RISK_MS = 30 * 60_000; // same threshold the API uses

/**
 * The SLA rail: elapsed share of the allowed window, coloured by what it means.
 * Used for both the response and the resolution clock of an incident.
 */
@Component({
  selector: 'app-sla-rail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; min-width: 0; }
    .top { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-bottom: 5px; }
    .label { font-size: 12.5px; color: var(--text-2); font-weight: 560; }
    .text { font-size: 12.5px; font-weight: 620; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .track { height: 6px; border-radius: 3px; background: var(--sunken); overflow: hidden; }
    .fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; background: var(--ok); }
    .risk .fill { background: var(--warn); } .risk .text { color: var(--warn); }
    .breach .fill, .late .fill { background: var(--danger); } .breach .text, .late .text { color: var(--danger); }
    .met .fill { background: var(--ok); opacity: 0.55; } .met .text { color: var(--ok); }
    .ok .text { color: var(--text); }
    .none .text { color: var(--text-3); font-weight: 500; }
    .compact .top { margin-bottom: 4px; }
    .compact .track { height: 4px; }
    .compact .text { font-size: 12px; }
  `,
  template: `
    <div [class]="'rail ' + state() + (compact() ? ' compact' : '')" role="img" [attr.aria-label]="(label() || 'SLA') + ': ' + text()">
      <div class="top">
        @if (label()) { <span class="label">{{ label() }}</span> }
        <span class="text">{{ text() }}</span>
      </div>
      @if (state() !== 'none') {
        <div class="track"><div class="fill" [style.width.%]="pct()"></div></div>
      }
    </div>
  `,
})
export class SlaRailComponent {
  private readonly clock = inject(ClockService);

  readonly label = input('');
  readonly startAt = input<string | null>(null);
  readonly dueAt = input<string | null>(null);
  /** respondedAt / resolvedAt: when the clock stopped */
  readonly doneAt = input<string | null>(null);
  /** Hide the clock entirely (cancelled incidents, or finished without ever starting). */
  readonly inactive = input(false);
  readonly compact = input(false);

  private readonly calc = computed(() => {
    const start = parseUtc(this.startAt())?.getTime();
    const due = parseUtc(this.dueAt())?.getTime();
    if (this.inactive() || start == null || due == null || due <= start) return { state: 'none' as RailState, pct: 0, text: '–' };

    const done = parseUtc(this.doneAt())?.getTime();
    const total = due - start;

    if (done != null) {
      const pct = Math.min(100, ((done - start) / total) * 100);
      return done <= due
        ? { state: 'met' as RailState, pct, text: `Met in ${formatMs(done - start)}` }
        : { state: 'late' as RailState, pct: 100, text: `Late by ${formatMs(done - due)}` };
    }

    const now = this.clock.now();
    const left = due - now;
    const pct = Math.max(0, Math.min(100, ((now - start) / total) * 100));
    if (left <= 0) return { state: 'breach' as RailState, pct: 100, text: `Overdue ${formatMs(left)}` };
    if (left <= AT_RISK_MS) return { state: 'risk' as RailState, pct, text: `${formatMs(left)} left` };
    return { state: 'ok' as RailState, pct, text: `${formatMs(left)} left` };
  });

  protected readonly state = computed(() => this.calc().state);
  protected readonly pct = computed(() => this.calc().pct);
  protected readonly text = computed(() => this.calc().text);
}
