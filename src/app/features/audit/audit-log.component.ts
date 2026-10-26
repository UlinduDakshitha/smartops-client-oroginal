import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuditApi } from '../../core/api/misc.api';
import { AuditLog } from '../../core/models/models';
import { DirectoryService } from '../../core/services/directory.service';
import { toApiError } from '../../core/util/errors';
import { DateTimePipe } from '../../shared/pipes/format.pipes';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';

const SIZE = 25;

@Component({
  selector: 'app-audit-log',
  imports: [IconComponent, PaginationComponent, EmptyStateComponent, DateTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
    }

    .audit-page {
      max-width: 100%;
      padding: 24px 32px 56px;
    }

    /* Head */
    .title-cluster {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .title-cluster h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 750;
      letter-spacing: -0.02em;
      color: var(--text);
    }
    .total-tag {
      font-size: 12px;
      font-weight: 600;
      padding: 2px 9px;
      border-radius: 999px;
      background: var(--sunken);
      color: var(--text-2);
      font-variant-numeric: tabular-nums;
    }
    .subtitle {
      margin: 4px 0 0;
      font-size: 13.5px;
      color: var(--text-2);
    }

    /* Card-free Workspace */
    .audit-workspace {
      display: flex;
      flex-direction: column;
      margin-top: 18px;
    }

    /* Flat Toolbar */
    .toolbar {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
      padding: 4px 0 16px;
      border-bottom: 1px solid var(--line);
    }
    .search-wrap {
      position: relative;
      flex: 1 1 240px;
      min-width: 200px;
      max-width: 420px;
    }
    .search-wrap app-icon {
      position: absolute;
      left: 11px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-3);
      pointer-events: none;
    }
    .search-input {
      padding-left: 34px;
      height: 36px;
      font-size: 13px;
      border-radius: var(--r-md);
      width: 100%;
    }

    .filter-select {
      height: 36px;
      font-size: 13px;
      width: 170px;
      min-width: 150px;
      flex-shrink: 0;
      border-radius: var(--r-md);
    }

    .scope-ribbon {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .scope-chip {
      display: inline-flex;
      align-items: center;
      height: 36px;
      padding: 0 14px;
      border-radius: 999px;
      border: 1px solid var(--line-2);
      background: var(--surface);
      color: var(--text-2);
      font-size: 12.5px;
      font-weight: 540;
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      transition: all 0.12s ease;
    }
    .scope-chip:hover {
      background: var(--sunken);
      color: var(--text);
    }
    .scope-chip.active {
      background: var(--brand);
      border-color: var(--brand);
      color: var(--on-brand);
      font-weight: 600;
    }

    .reset-link {
      font-size: 12.5px;
      color: var(--danger);
      background: none;
      border: 0;
      padding: 0 6px;
      cursor: pointer;
      font-weight: 560;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .reset-link:hover {
      text-decoration: underline;
    }

    /* Table - cardless, open table */
    .table-wrap {
      overflow-x: auto;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
    }
    .table th {
      padding: 12px 14px;
      font-weight: 600;
      font-size: 11.5px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-2);
      border-bottom: 1px solid var(--line);
      white-space: nowrap;
      text-align: left;
      background: transparent;
    }
    .table td {
      padding: 13px 14px;
      border-bottom: 1px solid var(--line);
      vertical-align: middle;
    }
    .table tbody tr:hover td {
      background: color-mix(in srgb, var(--brand) 3%, transparent);
    }

    /* Column Sizing */
    .th-expand, .td-expand {
      width: 44px;
      text-align: center;
    }
    .th-when, .td-when {
      width: 180px;
    }
    .th-who, .td-who {
      width: 200px;
    }
    .th-action, .td-action {
      min-width: 200px;
    }
    .th-entity, .td-entity {
      min-width: 180px;
    }

    /* Toggle button */
    .toggle-btn {
      width: 28px;
      height: 28px;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--r-sm);
    }
    .chev {
      display: inline-flex;
      transition: transform 0.15s ease;
    }
    .chev-open {
      transform: rotate(90deg);
    }

    /* Actor Cell */
    .actor-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .actor-mark {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: color-mix(in srgb, var(--brand) 12%, var(--surface));
      color: var(--brand);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .actor-system {
      background: var(--sunken);
      color: var(--text-2);
    }
    .actor-name {
      font-weight: 550;
      color: var(--text);
      font-size: 13px;
    }

    /* Action Cell */
    .action-tag {
      font-weight: 650;
      color: var(--text);
      font-size: 13px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    /* Entity Cell */
    .entity-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .entity-name {
      font-weight: 550;
      color: var(--text-2);
      font-size: 13px;
    }
    .entity-id-tag {
      font-size: 11px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      padding: 1px 6px;
      border-radius: 4px;
      background: var(--sunken);
      color: var(--text-3);
    }

    .date-txt {
      color: var(--text-2);
      font-size: 12.5px;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    /* Diff View */
    .detail-row td {
      background: color-mix(in srgb, var(--surface-2) 65%, transparent);
      padding: 14px 16px 18px;
      border-bottom: 1px solid var(--line);
    }
    .detail-pad {
      padding: 0 !important;
    }
    .diff-container {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    @media (max-width: 768px) {
      .diff-container {
        grid-template-columns: 1fr;
      }
    }
    .diff-block {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .diff-badge {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-3);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .diff-code {
      margin: 0;
      padding: 12px 14px;
      border: 1px solid var(--line);
      border-radius: var(--r-md);
      background: var(--surface);
      color: var(--text);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font-size: 12.5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      line-height: 1.5;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    }

    .empty-wrap {
      padding: 36px 0;
    }

    @media (max-width: 768px) {
      .audit-page {
        padding: 16px 16px 40px;
      }
      .toolbar {
        flex-direction: column;
        align-items: stretch;
      }
      .search-wrap {
        max-width: 100%;
      }
    }
  `,
  template: `
    <div class="audit-page">
      <div class="page-head">
        <div>
          <div class="title-cluster">
            <h1>Audit log</h1>
            <span class="total-tag">{{ items().length }} {{ items().length === 1 ? 'event' : 'events' }}</span>
          </div>
          <p class="subtitle">Immutable ledger of sign-ins, operational updates, and administrative actions.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn" (click)="load()" [disabled]="loading()">
            <app-icon name="refresh" /> Refresh
          </button>
        </div>
      </div>

      <div class="audit-workspace">
        <div class="toolbar">
          <div class="search-wrap">
            <app-icon name="search" />
            <input
              class="input search-input"
              type="search"
              placeholder="Search action, details, actor or entity..."
              aria-label="Search audit log"
              [value]="term()"
              (input)="setTerm($any($event.target).value)"
            />
          </div>
          <select
            class="select filter-select"
            aria-label="Filter by entity"
            [value]="entity()"
            (change)="setEntity($any($event.target).value)"
          >
            <option value="">All entities</option>
            @for (e of entities(); track e) {
              <option [value]="e">{{ e }}</option>
            }
          </select>
          <div class="scope-ribbon" role="group" aria-label="Whose activity">
            <button
              type="button"
              class="scope-chip"
              [class.active]="scope() === 'all'"
              (click)="setScope('all')"
            >
              Everyone
            </button>
            <button
              type="button"
              class="scope-chip"
              [class.active]="scope() === 'mine'"
              (click)="setScope('mine')"
            >
              Only me
            </button>
          </div>
          @if (term() || entity() || scope() !== 'all') {
            <button type="button" class="reset-link" (click)="resetFilters()">Reset filters</button>
          }
        </div>

        @if (error()) {
          <div class="alert alert-error" role="alert" style="margin-top: 16px;">{{ error() }}</div>
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th class="th-expand"><span class="sr-only">Expand</span></th>
                  <th class="th-when">Timestamp</th>
                  <th class="th-who">Actor</th>
                  <th class="th-action">Action</th>
                  <th class="th-entity">Target Entity</th>
                </tr>
              </thead>
              <tbody>
                @if (loading()) {
                  @for (n of [1,2,3,4,5]; track n) {
                    <tr>
                      <td colspan="5"><span class="skeleton" style="height:26px; border-radius: 4px;"></span></td>
                    </tr>
                  }
                } @else {
                  @for (l of rows(); track l.id) {
                    <tr class="audit-row" [class.open]="expanded() === l.id">
                      <td class="td-expand">
                        @if (l.oldValue || l.newValue) {
                          <button
                            type="button"
                            class="btn btn-quiet btn-icon toggle-btn"
                            [attr.aria-expanded]="expanded() === l.id"
                            aria-label="Toggle changes"
                            (click)="toggle(l.id)"
                          >
                            <span class="chev" [class.chev-open]="expanded() === l.id">
                              <app-icon name="chevron-right" [size]="14" />
                            </span>
                          </button>
                        }
                      </td>
                      <td class="td-when">
                        <span class="date-txt">{{ l.createdAt | dt }}</span>
                      </td>
                      <td class="td-who">
                        <div class="actor-cell">
                          <span class="actor-mark" [class.actor-system]="!l.userId">
                            <app-icon [name]="l.userId ? 'user' : 'shield'" [size]="13" />
                          </span>
                          <span class="actor-name">{{ l.userId ? dir.actorName(l.userId) : 'System' }}</span>
                        </div>
                      </td>
                      <td class="td-action">
                        <span class="action-tag">{{ l.action }}</span>
                      </td>
                      <td class="td-entity">
                        <div class="entity-cell">
                          <span class="entity-name">{{ l.entityName }}</span>
                          @if (l.entityId) {
                            <span class="entity-id-tag">{{ l.entityId.slice(0, 8) }}</span>
                          }
                        </div>
                      </td>
                    </tr>
                    @if (expanded() === l.id) {
                      <tr class="detail-row">
                        <td class="detail-pad"></td>
                        <td colspan="4">
                          <div class="diff-container">
                            <div class="diff-block">
                              <div class="diff-badge">Previous State</div>
                              <pre class="diff-code">{{ l.oldValue || 'None recorded' }}</pre>
                            </div>
                            <div class="diff-block">
                              <div class="diff-badge">Updated State</div>
                              <pre class="diff-code">{{ l.newValue || 'None recorded' }}</pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    }
                  }
                }
              </tbody>
            </table>
          </div>

          @if (!loading() && filtered().length === 0) {
            <div class="empty-wrap">
              <app-empty-state icon="audit" title="No matching entries" message="Change the search or filters to see more activity." />
            </div>
          }

          <app-pagination [page]="page()" [pageSize]="size" [total]="filtered().length" (pageChange)="page.set($event)" />
        }
      </div>
    </div>
  `,
})
export class AuditLogComponent {
  private readonly api = inject(AuditApi);
  protected readonly dir = inject(DirectoryService);
  protected readonly size = SIZE;

  protected readonly items = signal<AuditLog[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly term = signal('');
  protected readonly entity = signal('');
  protected readonly scope = signal<'all' | 'mine'>('all');
  protected readonly page = signal(1);
  protected readonly expanded = signal<string | null>(null);

  protected readonly entities = computed(() => [...new Set(this.items().map((l) => l.entityName))].sort());
  protected readonly filtered = computed(() => {
    const t = this.term().trim().toLowerCase();
    const e = this.entity();
    return this.items().filter(
      (l) =>
        (!e || l.entityName === e) &&
        (!t ||
          l.action.toLowerCase().includes(t) ||
          (l.newValue ?? '').toLowerCase().includes(t) ||
          (l.oldValue ?? '').toLowerCase().includes(t) ||
          this.dir.userName(l.userId).toLowerCase().includes(t)),
    );
  });
  protected readonly rows = computed(() => this.filtered().slice((this.page() - 1) * SIZE, this.page() * SIZE));

  constructor() {
    effect(() => {
      this.scope();
      untracked(() => this.load());
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    (this.scope() === 'mine' ? this.api.mine() : this.api.all()).subscribe({
      next: (list) => {
        this.items.set([...list].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }

  protected setTerm(v: string): void { this.term.set(v); this.page.set(1); }
  protected setEntity(v: string): void { this.entity.set(v); this.page.set(1); }
  protected setScope(v: string): void { this.scope.set(v === 'mine' ? 'mine' : 'all'); this.page.set(1); }
  protected toggle(id: string): void { this.expanded.update((c) => (c === id ? null : id)); }
  protected resetFilters(): void {
    this.term.set('');
    this.entity.set('');
    this.scope.set('all');
    this.page.set(1);
  }
}
