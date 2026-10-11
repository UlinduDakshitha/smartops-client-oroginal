import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface BreakdownItem { label: string; value: number; tone: 'muted' | 'info' | 'warn' | 'danger' | 'ok' | 'brand' | 'violet' }

@Component({
  selector: 'app-breakdown-bars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; }
    .row { display: grid; grid-template-columns: 76px 1fr 36px; gap: 12px; align-items: center; padding: 7px 0; }
    .label { color: var(--text-2); font-size: 13.5px; }
    .track { height: 10px; border-radius: 5px; background: var(--sunken); overflow: hidden; }
    .fill { height: 100%; border-radius: 5px; min-width: 2px; transition: width 0.5s ease; }
    .val { text-align: right; font-weight: 640; font-variant-numeric: tabular-nums; }
    .muted { background: var(--line-2); } .info { background: var(--info); } .warn { background: var(--warn); }
    .danger { background: var(--danger); } .ok { background: var(--ok); } .brand { background: var(--brand); } .violet { background: var(--violet); }
  `,
  template: `
    @for (i of items(); track i.label) {
      <div class="row">
        <span class="label">{{ i.label }}</span>
        <div class="track" aria-hidden="true"><div [class]="'fill ' + i.tone" [style.width.%]="pct(i.value)"></div></div>
        <span class="val">{{ i.value }}</span>
      </div>
    }
  `,
})
export class BreakdownBarsComponent {
  readonly items = input.required<BreakdownItem[]>();
  private readonly max = computed(() => Math.max(1, ...this.items().map((i) => i.value)));
  protected pct = (v: number) => (v / this.max()) * 100;
}
