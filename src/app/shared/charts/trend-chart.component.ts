import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MonthlyTrend } from '../../core/models/models';

const W = 640, H = 270, L = 38, R = 8, T = 12, B = 30;

function niceMax(v: number): number {
  if (v <= 4) return 4;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * mag >= v) return m * mag;
  return 10 * mag;
}

/** Grouped monthly bars: opened / resolved / closed. Pure SVG, no chart library. */
@Component({
  selector: 'app-trend-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; }
    .legend { display: flex; gap: 18px; flex-wrap: wrap; margin-bottom: 8px; font-size: 13px; color: var(--text-2); }
    .legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 6px; }
    svg { width: 100%; height: auto; overflow: visible; }
    .grid { stroke: var(--line); stroke-width: 1; }
    .axis { fill: var(--text-3); font-size: 11.5px; }
    .opened { fill: var(--brand); } .resolved { fill: var(--ok); } .closed { fill: var(--line-2); }
    rect.bar:hover { filter: brightness(1.12); }
    .sw-opened { background: var(--brand); } .sw-resolved { background: var(--ok); } .sw-closed { background: var(--line-2); }
  `,
  template: `
    <div class="legend" aria-hidden="true">
      <span><i class="sw-opened"></i>Opened</span><span><i class="sw-resolved"></i>Resolved</span><span><i class="sw-closed"></i>Closed</span>
    </div>
    <svg [attr.viewBox]="'0 0 ' + w + ' ' + h" role="img" [attr.aria-label]="summary()">
      @for (t of ticks(); track t.v) {
        <line class="grid" [attr.x1]="l" [attr.x2]="w - r" [attr.y1]="t.y" [attr.y2]="t.y" />
        <text class="axis" [attr.x]="l - 8" [attr.y]="t.y + 4" text-anchor="end">{{ t.v }}</text>
      }
      @for (g of groups(); track g.key) {
        @for (b of g.bars; track b.cls) {
          <rect class="bar" [class]="'bar ' + b.cls" [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h" rx="2">
            <title>{{ g.label }}: {{ b.value }} {{ b.cls }}</title>
          </rect>
        }
        <text class="axis" [attr.x]="g.cx" [attr.y]="h - 10" text-anchor="middle">{{ g.label }}</text>
      }
    </svg>
  `,
})
export class TrendChartComponent {
  readonly data = input.required<MonthlyTrend[]>();
  protected readonly w = W; protected readonly h = H; protected readonly l = L; protected readonly r = R;

  private readonly sorted = computed(() => [...this.data()].sort((a, b) => a.year - b.year || a.month - b.month));
  private readonly max = computed(() => niceMax(Math.max(0, ...this.sorted().flatMap((d) => [d.incidentCount, d.resolvedCount, d.closedCount]))));
  private readonly y = (v: number) => T + (H - T - B) * (1 - v / this.max());

  protected readonly ticks = computed(() => {
    const m = this.max();
    return [0, 1, 2, 3, 4].map((i) => ({ v: (m / 4) * i, y: this.y((m / 4) * i) }));
  });

  protected readonly groups = computed(() => {
    const items = this.sorted();
    const slot = (W - L - R) / Math.max(items.length, 1);
    const bw = Math.min(22, (slot * 0.72) / 3);
    return items.map((d, i) => {
      const cx = L + slot * i + slot / 2;
      const series = [
        { cls: 'opened', value: d.incidentCount },
        { cls: 'resolved', value: d.resolvedCount },
        { cls: 'closed', value: d.closedCount },
      ];
      return {
        key: `${d.year}-${d.month}`,
        cx,
        label: d.monthName.slice(0, 3) + (d.month === 1 || i === 0 ? ` ${String(d.year).slice(2)}` : ''),
        bars: series.map((s, k) => {
          const y = this.y(s.value);
          return { cls: s.cls, value: s.value, x: cx - (bw * 3) / 2 + k * bw + 1, w: bw - 2, y, h: Math.max(0, H - B - y) };
        }),
      };
    });
  });

  protected readonly summary = computed(() => {
    const items = this.sorted();
    return `Monthly incidents for ${items.length} months. ` + items.map((d) => `${d.monthName} ${d.year}: ${d.incidentCount} opened, ${d.resolvedCount} resolved, ${d.closedCount} closed`).join('; ');
  });
}
