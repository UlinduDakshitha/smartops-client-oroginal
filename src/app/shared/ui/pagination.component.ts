import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-pagination',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 12px 16px; border-top: 1px solid var(--line); }
    .summary { color: var(--text-2); font-size: 13px; }
    .pages { display: flex; gap: 4px; align-items: center; }
    .gap { color: var(--text-3); padding: 0 4px; }
    .btn.current { background: var(--brand); border-color: var(--brand); color: var(--on-brand); }
  `,
  template: `
    <span class="summary num">
      @if (total() === 0) { No results } @else { Showing {{ from() }}–{{ to() }} of {{ total() }} }
    </span>
    @if (pages() > 1) {
      <nav class="pages" aria-label="Pagination">
        <button type="button" class="btn btn-sm btn-icon" aria-label="Previous page" [disabled]="page() <= 1" (click)="go(page() - 1)">
          <app-icon name="chevron-left" />
        </button>
        @for (p of window(); track $index) {
          @if (p === 0) { <span class="gap">…</span> }
          @else {
            <button type="button" class="btn btn-sm btn-icon num" [class.current]="p === page()" [attr.aria-current]="p === page() ? 'page' : null" (click)="go(p)">{{ p }}</button>
          }
        }
        <button type="button" class="btn btn-sm btn-icon" aria-label="Next page" [disabled]="page() >= pages()" (click)="go(page() + 1)">
          <app-icon name="chevron-right" />
        </button>
      </nav>
    }
  `,
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly total = input.required<number>();
  readonly pageChange = output<number>();

  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  protected readonly from = computed(() => (this.page() - 1) * this.pageSize() + 1);
  protected readonly to = computed(() => Math.min(this.total(), this.page() * this.pageSize()));

  /** 1 … 4 5 [6] 7 8 … 20 (0 = ellipsis) */
  protected readonly window = computed(() => {
    const total = this.pages();
    const cur = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const set = new Set([1, total, cur - 1, cur, cur + 1].filter((n) => n >= 1 && n <= total));
    const sorted = [...set].sort((a, b) => a - b);
    const out: number[] = [];
    sorted.forEach((n, i) => {
      if (i > 0 && n - sorted[i - 1] > 1) out.push(0);
      out.push(n);
    });
    return out;
  });

  protected go(p: number): void {
    if (p >= 1 && p <= this.pages() && p !== this.page()) this.pageChange.emit(p);
  }
}
