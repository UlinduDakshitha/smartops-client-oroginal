import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IncidentApi } from '../../core/api/incident.api';
import {
  Incident,
  IncidentPage,
  IncidentStatus,
  LEVEL_LABEL,
  PRIORITIES,
  Priority,
  SEVERITIES,
  STATUSES,
  STATUS_LABEL,
  Severity,
} from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { DirectoryService } from '../../core/services/directory.service';
import { toApiError } from '../../core/util/errors';
import { RelativeTimePipe } from '../../shared/pipes/format.pipes';
import { LevelBadgeComponent, StatusBadgeComponent } from '../../shared/ui/badges.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import { SlaRailComponent } from '../../shared/ui/sla-rail.component';
import { IncidentFormComponent } from './incident-form.component';
import { activeClock, needsAttention } from './incident-utils';

const PAGE_SIZE = 15;

@Component({
  selector: 'app-incident-list',
  imports: [
    RouterLink,
    IconComponent,
    StatusBadgeComponent,
    LevelBadgeComponent,
    SlaRailComponent,
    PaginationComponent,
    EmptyStateComponent,
    IncidentFormComponent,
    RelativeTimePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
    }

    .incident-page {
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

    /* Seamless Workspace - completely card-free, flows directly on the page canvas */
    .incident-workspace {
      display: flex;
      flex-direction: column;
      margin-top: 18px;
    }

    /* Filter Toolbar - flat, seamless, direct on canvas */
    .filter-bar {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 4px 0 16px;
      border-bottom: 1px solid var(--line);
    }
    .filter-top {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .search-wrap {
      position: relative;
      flex: 1 1 280px;
      min-width: 220px;
    }
    .search-wrap app-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-3);
      pointer-events: none;
    }
    .search-input {
      padding-left: 32px;
      height: 34px;
      font-size: 13px;
    }
    .select-cluster {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .filter-select {
      min-width: 130px;
      height: 34px;
      font-size: 13px;
    }
    .toggles-cluster {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .check-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 0 11px;
      height: 34px;
      border-radius: var(--r-md);
      border: 1px solid var(--line-2);
      background: var(--surface);
      color: var(--text-2);
      font-size: 12.5px;
      font-weight: 550;
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      transition: all 0.12s ease;
    }
    .check-pill:hover {
      background: var(--sunken);
      color: var(--text);
    }
    .check-pill.checked {
      background: var(--brand-soft);
      border-color: color-mix(in srgb, var(--brand) 30%, transparent);
      color: var(--brand-ink);
    }
    .check-pill input {
      margin: 0;
      accent-color: var(--brand);
    }
    .reset-link {
      font-size: 12.5px;
      color: var(--danger);
      background: none;
      border: 0;
      padding: 0 6px;
      cursor: pointer;
      font-weight: 560;
    }
    .reset-link:hover {
      text-decoration: underline;
    }

    /* Status chips ribbon */
    .status-chips {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow-x: auto;
      padding-bottom: 2px;
    }
    .status-chip {
      display: inline-flex;
      align-items: center;
      height: 28px;
      padding: 0 11px;
      border-radius: 999px;
      border: 1px solid var(--line-2);
      background: var(--surface);
      color: var(--text-2);
      font-size: 12.5px;
      font-weight: 520;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.12s ease;
    }
    .status-chip:hover {
      background: var(--sunken);
      color: var(--text);
    }
    .status-chip.active {
      background: var(--brand);
      border-color: var(--brand);
      color: var(--on-brand);
      font-weight: 600;
    }

    /* Table - completely cardless, open modern enterprise table */
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
      font-size: 12px;
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
    .table tbody tr:last-child td {
      border-bottom: 1px solid var(--line);
    }
    .table tbody tr.clickable {
      cursor: pointer;
      transition: background-color 0.1s ease;
    }
    .table tbody tr.clickable:hover td {
      background: color-mix(in srgb, var(--brand) 4%, transparent);
    }

    /* Column proportions eliminating blank voids */
    .th-incident, .td-incident {
      min-width: 280px;
    }
    .num-tag {
      font-size: 11.5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 600;
      color: var(--text-3);
      background: var(--sunken);
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 3px;
    }
    .title-link {
      font-weight: 600;
      color: var(--text);
      display: block;
      line-height: 1.35;
    }
    .title-link:hover {
      color: var(--brand);
      text-decoration: none;
    }
    .th-status, .td-status {
      width: 110px;
      white-space: nowrap;
    }
    .th-level, .td-level {
      width: 95px;
      white-space: nowrap;
    }
    .th-assignee, .td-assignee {
      width: 180px;
      max-width: 220px;
    }
    .assignee-name {
      font-weight: 560;
    }
    .th-sla, .td-sla {
      width: 185px;
    }
    .th-opened, .td-opened {
      width: 105px;
      text-align: right;
      white-space: nowrap;
      color: var(--text-2);
      font-size: 12.5px;
    }

    .pagination-bar {
      padding: 12px 0 0;
      background: transparent;
    }
    .empty-wrap {
      padding: 32px 0;
    }
    .err-box {
      padding: 24px 0;
    }
    .skeleton-row td {
      padding: 16px 14px;
    }
    .spin {
      animation: spin-refresh 0.9s linear infinite;
    }
    @keyframes spin-refresh {
      to { transform: rotate(360deg); }
    }
  `,
  template: `
    <div class="page incident-page">
      <!-- Head Section -->
      <div class="page-head">
        <div>
          <div class="title-cluster">
            <h1>Incidents</h1>
            <span class="total-tag">{{ total() }} incidents</span>
          </div>
          <p>Track, assign and resolve incidents inside their SLA.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn" (click)="refresh()" [disabled]="loading()" aria-label="Refresh incidents">
            <app-icon name="refresh" [class.spin]="loading()" /> Refresh
          </button>
          <button type="button" class="btn btn-primary" (click)="creating.set(true)">
            <app-icon name="plus" /> New incident
          </button>
        </div>
      </div>

      <!-- Completely Cardless Workspace -->
      <div class="incident-workspace">
        <!-- Seamless Filter Toolbar -->
        <div class="filter-bar">
          <div class="filter-top">
            <div class="search-wrap">
              <app-icon name="search" />
              <input
                class="input search-input"
                type="search"
                placeholder="Search by number, title or description..."
                aria-label="Search incidents"
                [value]="search()"
                (input)="setSearch($any($event.target).value)"
              />
            </div>

            <div class="select-cluster">
              <select class="select filter-select" aria-label="Filter by priority" [value]="priority() ?? ''" (change)="setPriority($any($event.target).value)">
                <option value="">All priorities</option>
                @for (p of priorities; track p) { <option [value]="p">{{ levelLabel(p) }}</option> }
              </select>

              <select class="select filter-select" aria-label="Filter by severity" [value]="severity() ?? ''" (change)="setSeverity($any($event.target).value)">
                <option value="">All severities</option>
                @for (s of severities; track s) { <option [value]="s">{{ levelLabel(s) }}</option> }
              </select>
            </div>

            <div class="toggles-cluster">
              <label class="check-pill" [class.checked]="mine()">
                <input type="checkbox" [checked]="mine()" (change)="setMine($any($event.target).checked)" />
                <span>Assigned to me</span>
              </label>
              <label class="check-pill" [class.checked]="attention()">
                <input type="checkbox" [checked]="attention()" (change)="setAttention($any($event.target).checked)" />
                <span>SLA at risk or overdue</span>
              </label>
            </div>

            @if (filtersActive()) {
              <button type="button" class="reset-link" (click)="clearFilters()">
                Clear filters
              </button>
            }
          </div>

          <div class="status-chips" role="group" aria-label="Filter by status">
            <button type="button" class="status-chip" [class.active]="status() === null" (click)="setStatus(null)">All</button>
            @for (s of statuses; track s) {
              <button type="button" class="status-chip" [class.active]="status() === s" (click)="setStatus(s)">{{ statusLabel(s) }}</button>
            }
          </div>
        </div>

        @if (error()) {
          <div class="err-box">
            <div class="alert alert-error" role="alert"><app-icon name="alert-circle" [size]="18" /> {{ error() }}</div>
            <button type="button" class="btn" style="margin-top:12px" (click)="refresh()">Try again</button>
          </div>
        } @else {
          <!-- Completely Cardless Table -->
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th class="th-incident">Incident</th>
                  <th class="th-status">Status</th>
                  <th class="th-level">Priority</th>
                  <th class="th-level">Severity</th>
                  <th class="th-assignee">Assigned to</th>
                  <th class="th-sla">SLA clock</th>
                  <th class="th-opened">Opened</th>
                </tr>
              </thead>
              <tbody>
                @if (loading() && rows().length === 0) {
                  @for (n of skeletons; track n) {
                    <tr class="skeleton-row"><td colspan="7"><span class="skeleton" style="height:20px"></span></td></tr>
                  }
                } @else {
                  @for (i of rows(); track i.id) {
                    <tr class="clickable" (click)="open(i)">
                      <td class="td-incident">
                        <span class="num-tag">{{ i.incidentNumber }}</span>
                        <a class="title-link" [routerLink]="['/incidents', i.id]" (click)="$event.stopPropagation()">{{ i.title }}</a>
                      </td>
                      <td class="td-status"><app-status-badge [status]="i.status" /></td>
                      <td class="td-level"><app-level-badge [level]="i.priority" /></td>
                      <td class="td-level"><app-level-badge [level]="i.severity" /></td>
                      <td class="td-assignee">
                        @if (i.assignedUserId) {
                          <div class="assignee-name truncate">{{ dir.userName(i.assignedUserId) }}</div>
                          <div class="small faint truncate">{{ dir.teamName(i.assignedTeamId) }}</div>
                        } @else if (i.assignedTeamId) {
                          <div class="assignee-name truncate">{{ dir.teamName(i.assignedTeamId) }}</div>
                          <div class="small faint">Whole team</div>
                        } @else {
                          <span class="faint">Unassigned</span>
                        }
                      </td>
                      <td class="td-sla">
                        @let c = clock(i);
                        <app-sla-rail [compact]="true" [label]="c.label" [startAt]="c.startAt" [dueAt]="c.dueAt" [doneAt]="c.doneAt" [inactive]="c.inactive" />
                      </td>
                      <td class="td-opened">{{ i.createdAt | rel }}</td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>

          @if (!loading() && rows().length === 0) {
            <div class="empty-wrap">
              @if (filtersActive()) {
                <app-empty-state icon="filter" title="No incidents match these filters" message="Try removing a filter or searching for something broader.">
                  <button type="button" class="btn" (click)="clearFilters()">Clear filters</button>
                </app-empty-state>
              } @else {
                <app-empty-state icon="check-circle" title="No incidents yet" message="When something breaks, log it here and the SLA clock starts.">
                  <button type="button" class="btn btn-primary" (click)="creating.set(true)"><app-icon name="plus" /> New incident</button>
                </app-empty-state>
              }
            </div>
          }

          <div class="pagination-bar">
            <app-pagination [page]="page()" [pageSize]="pageSize" [total]="total()" (pageChange)="page.set($event)" />
          </div>
        }
      </div>
    </div>

    @if (creating()) {
      <app-incident-form (closed)="creating.set(false)" (saved)="onCreated($event)" />
    }
  `,
})
export class IncidentListComponent {
  private readonly api = inject(IncidentApi);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  protected readonly dir = inject(DirectoryService);

  /** ?q= (set when arriving from a notification) */
  readonly q = input<string | undefined>();

  protected readonly pageSize = PAGE_SIZE;
  protected readonly statuses = STATUSES;
  protected readonly priorities = PRIORITIES;
  protected readonly severities = SEVERITIES;
  protected readonly skeletons = [1, 2, 3, 4, 5, 6];

  protected readonly search = signal('');
  protected readonly status = signal<IncidentStatus | null>(null);
  protected readonly priority = signal<Priority | null>(null);
  protected readonly severity = signal<Severity | null>(null);
  protected readonly mine = signal(false);
  protected readonly attention = signal(false);
  protected readonly page = signal(1);
  protected readonly creating = signal(false);

  protected readonly loading = signal(false);
  protected readonly error = signal('');
  private readonly serverPage = signal<IncidentPage | null>(null);
  private readonly allItems = signal<Incident[] | null>(null);

  /** Text search, "assigned to me" and SLA filters are not supported by the paged endpoint, so those load the full list. */
  protected readonly localMode = computed(() => this.search().trim() !== '' || this.mine() || this.attention());

  private readonly filtered = computed(() => {
    const all = this.allItems() ?? [];
    const term = this.search().trim().toLowerCase();
    const me = this.auth.user()?.id;
    const st = this.status(), pr = this.priority(), sv = this.severity();
    return all.filter(
      (i) =>
        (st === null || i.status === st) &&
        (pr === null || i.priority === pr) &&
        (sv === null || i.severity === sv) &&
        (!this.mine() || i.assignedUserId === me) &&
        (!this.attention() || needsAttention(i)) &&
        (!term || i.incidentNumber.toLowerCase().includes(term) || i.title.toLowerCase().includes(term) || i.description.toLowerCase().includes(term)),
    );
  });

  protected readonly rows = computed<Incident[]>(() => {
    if (!this.localMode()) return this.serverPage()?.items ?? [];
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });
  protected readonly total = computed(() => (this.localMode() ? this.filtered().length : (this.serverPage()?.totalCount ?? 0)));
  protected readonly filtersActive = computed(
    () => this.localMode() || this.status() !== null || this.priority() !== null || this.severity() !== null,
  );

  protected levelLabel = (n: number) => LEVEL_LABEL[n];
  protected statusLabel = (s: IncidentStatus) => STATUS_LABEL[s];
  protected clock = activeClock;

  constructor() {
    // Seed the search box from ?q= (also reacts if a notification link changes it while we are open).
    effect(() => {
      const q = this.q();
      untracked(() => {
        if (q !== undefined && q !== this.search()) {
          this.search.set(q);
          this.page.set(1);
        }
      });
    });

    // Fetch whichever source the current filters need. Dependencies are tracked dynamically per branch.
    effect(() => {
      if (this.localMode()) {
        untracked(() => this.ensureAll());
      } else {
        const page = this.page();
        const filter = { status: this.status(), priority: this.priority(), severity: this.severity() };
        untracked(() => this.fetchPage(page, filter));
      }
    });
  }

  private ensureAll(force = false): void {
    if (this.allItems() !== null && !force) return;
    this.loading.set(true);
    this.error.set('');
    this.api.all().subscribe({
      next: (items) => {
        this.allItems.set(items);
        this.loading.set(false);
      },
      error: (e) => this.fail(e),
    });
  }

  private fetchPage(page: number, filter: { status: IncidentStatus | null; priority: Priority | null; severity: Severity | null }): void {
    this.loading.set(true);
    this.error.set('');
    this.api.paged(page, PAGE_SIZE, filter).subscribe({
      next: (res) => {
        this.serverPage.set(res);
        this.loading.set(false);
        // The last page can vanish after a refresh; step back instead of showing an empty page.
        if (res.totalPages > 0 && page > res.totalPages) this.page.set(res.totalPages);
      },
      error: (e) => this.fail(e),
    });
  }

  private fail(e: unknown): void {
    this.loading.set(false);
    this.error.set(toApiError(e).message);
  }

  protected refresh(): void {
    this.dir.load(true);
    if (this.localMode()) this.ensureAll(true);
    else this.fetchPage(this.page(), { status: this.status(), priority: this.priority(), severity: this.severity() });
  }

  protected setSearch(v: string): void { this.search.set(v); this.page.set(1); }
  protected setStatus(s: IncidentStatus | null): void { this.status.set(s); this.page.set(1); }
  protected setPriority(v: string): void { this.priority.set(v === '' ? null : (Number(v) as Priority)); this.page.set(1); }
  protected setSeverity(v: string): void { this.severity.set(v === '' ? null : (Number(v) as Severity)); this.page.set(1); }
  protected setMine(v: boolean): void { this.mine.set(v); this.page.set(1); }
  protected setAttention(v: boolean): void { this.attention.set(v); this.page.set(1); }

  protected clearFilters(): void {
    this.search.set('');
    this.status.set(null);
    this.priority.set(null);
    this.severity.set(null);
    this.mine.set(false);
    this.attention.set(false);
    this.page.set(1);
  }

  protected open(i: Incident): void {
    void this.router.navigate(['/incidents', i.id]);
  }

  protected onCreated(i: Incident): void {
    this.creating.set(false);
    void this.router.navigate(['/incidents', i.id]);
  }
}
