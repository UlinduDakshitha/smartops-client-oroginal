import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DashboardApi } from '../../core/api/misc.api';
import { ACCESS, DashboardSummary, MonthlyTrend, TeamWorkload } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { formatMinutes } from '../../core/util/dates';
import { toApiError } from '../../core/util/errors';
import { BreakdownBarsComponent, BreakdownItem } from '../../shared/charts/breakdown-bars.component';
import { TrendChartComponent } from '../../shared/charts/trend-chart.component';
import { RelativeTimePipe } from '../../shared/pipes/format.pipes';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { IconComponent } from '../../shared/ui/icon.component';

interface Segment { key: string; label: string; value: number; cls: string }

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, IconComponent, TrendChartComponent, BreakdownBarsComponent, EmptyStateComponent, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
    }

    /* Seamless dashboard flow - removes card-like isolated boxes */
    .dash-flow {
      display: flex;
      flex-direction: column;
      gap: 36px;
    }

    .dash-block {
      display: flex;
      flex-direction: column;
    }

    .section-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 1px solid color-mix(in srgb, var(--line) 75%, transparent);
    }
    .section-title h2 {
      font-size: 15px;
      font-weight: 650;
      letter-spacing: -0.01em;
      color: var(--text);
      margin: 0;
    }
    .section-title a {
      font-size: 13px;
      font-weight: 550;
      color: var(--brand);
      text-decoration: none;
    }
    .section-title a:hover {
      text-decoration: underline;
    }

    /* Seamless pipeline overview */
    .pipe-wrap {
      padding: 4px 0 8px;
      border-bottom: 1px solid color-mix(in srgb, var(--line) 75%, transparent);
      padding-bottom: 24px;
    }
    .pipe-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }
    .total-stat {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }
    .total-num {
      font-size: 38px;
      font-weight: 750;
      letter-spacing: -0.03em;
      line-height: 1;
      font-variant-numeric: tabular-nums;
      color: var(--text);
    }
    .total-label {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-2);
    }
    .open-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 4px 12px;
      border-radius: 999px;
      background: var(--brand-soft);
      color: var(--brand-ink);
      font-size: 13px;
      font-weight: 600;
      border: 1px solid color-mix(in srgb, var(--brand) 20%, transparent);
    }
    .open-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--brand);
    }
    .pipe-bar {
      display: flex;
      height: 14px;
      border-radius: 7px;
      overflow: hidden;
      gap: 2px;
      background: var(--sunken);
    }
    .pipe-seg {
      min-width: 4px;
      transition: flex-grow 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .pipe-legend {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 16px;
      margin-top: 18px;
    }
    @media (max-width: 900px) {
      .pipe-legend { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    }
    .lg-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .lg-val {
      font-size: 22px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      line-height: 1.1;
      color: var(--text);
    }
    .lg-label {
      display: flex;
      align-items: center;
      gap: 7px;
      color: var(--text-2);
      font-size: 12.5px;
    }
    .lg-label i {
      width: 8px;
      height: 8px;
      border-radius: 2px;
      display: inline-block;
      flex: none;
    }

    .s-new { background: var(--info); }
    .s-assigned { background: var(--violet); }
    .s-progress { background: var(--brand); }
    .s-resolved { background: var(--ok); }
    .s-closed { background: var(--line-2); }
    .s-cancelled { background: var(--muted-soft); box-shadow: inset 0 0 0 1px var(--line-2); }

    /* Columns layout */
    .cols {
      display: grid;
      grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
      gap: 32px;
    }
    @media (max-width: 1100px) {
      .cols { grid-template-columns: 1fr; gap: 28px; }
    }

    /* SLA health - clean, soft stat tiles instead of boxed cards */
    .sla-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .sla-tile {
      padding: 14px 16px;
      border-radius: var(--r-md);
      background: var(--surface-2);
      border: 1px solid color-mix(in srgb, var(--line) 70%, transparent);
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: background-color 0.12s ease;
    }
    .sla-tile.is-bad {
      background: color-mix(in srgb, var(--danger) 7%, var(--surface-2));
      border-color: color-mix(in srgb, var(--danger) 25%, transparent);
    }
    .sla-tile.is-risk {
      background: color-mix(in srgb, var(--warn) 7%, var(--surface-2));
      border-color: color-mix(in srgb, var(--warn) 25%, transparent);
    }
    .sla-num {
      font-size: 26px;
      font-weight: 720;
      letter-spacing: -0.02em;
      font-variant-numeric: tabular-nums;
      line-height: 1.1;
      color: var(--text);
    }
    .sla-num.bad { color: var(--danger); }
    .sla-num.risk { color: var(--warn); }
    .sla-num.good { color: var(--ok); }
    .sla-label {
      color: var(--text-2);
      font-size: 12.5px;
      line-height: 1.35;
    }
    .sla-avg {
      margin-top: 10px;
      padding: 12px 16px;
      border-radius: var(--r-md);
      background: var(--surface-2);
      border: 1px solid color-mix(in srgb, var(--line) 70%, transparent);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .sla-avg-label {
      font-size: 12.5px;
      color: var(--text-2);
    }
    .sla-avg-val {
      font-size: 16px;
      font-weight: 700;
      color: var(--text);
      font-variant-numeric: tabular-nums;
    }

    /* Breakdowns grid */
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 32px;
    }
    @media (max-width: 900px) {
      .grid-2 { grid-template-columns: 1fr; gap: 28px; }
    }

    /* Team workload table */
    .table-container {
      overflow-x: auto;
      border: 1px solid color-mix(in srgb, var(--line) 80%, transparent);
      border-radius: var(--r-md);
      background: var(--surface);
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
    }
    .table th {
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      color: var(--text-2);
      padding: 10px 14px;
      background: var(--surface-2);
      border-bottom: 1px solid var(--line);
      white-space: nowrap;
    }
    .table td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--line);
      vertical-align: middle;
    }
    .table tbody tr:last-child td {
      border-bottom: 0;
    }
    .table tbody tr:hover td {
      background: color-mix(in srgb, var(--brand) 3%, var(--surface));
    }
    .wl {
      display: flex;
      height: 9px;
      border-radius: 5px;
      overflow: hidden;
      gap: 1px;
      background: var(--sunken);
      min-width: 140px;
    }
    .wl span {
      display: block;
      min-width: 2px;
    }

    .updated {
      color: var(--text-3);
      font-size: 12.5px;
    }
  `,
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Operations overview</h1>
          <p>Where incidents are in the workflow, and which ones are running out of time.</p>
        </div>
        <div class="page-actions row">
          @if (updatedAt()) { <span class="updated">Updated {{ updatedAtIso() | rel }}</span> }
          <button type="button" class="btn" (click)="load()" [disabled]="loading()"><app-icon name="refresh" /> Refresh</button>
        </div>
      </div>

      @if (error()) {
        <div class="alert alert-error" role="alert"><app-icon name="alert-circle" [size]="18" /> {{ error() }}</div>
      } @else if (loading() && !summary()) {
        <div class="stack-lg">
          <span class="skeleton" style="height:140px"></span>
          <span class="skeleton" style="height:280px"></span>
        </div>
      } @else if (summary(); as s) {
        <div class="dash-flow">
          <!-- 1. Pipeline Overview (Seamless, open hero flow) -->
          <section class="pipe-wrap" aria-label="Incidents by status">
            <div class="pipe-head">
              <div class="total-stat">
                <span class="total-num">{{ s.totalIncidents }}</span>
                <span class="total-label">incidents in total</span>
              </div>
              <div class="open-pill">
                <span class="open-dot"></span>
                <span>{{ open() }} open right now</span>
              </div>
            </div>
            @if (s.totalIncidents > 0) {
              <div class="pipe-bar" role="img" [attr.aria-label]="barLabel()">
                @for (g of segments(); track g.key) {
                  @if (g.value > 0) { <div class="pipe-seg" [class]="'pipe-seg ' + g.cls" [style.flex-grow]="g.value" [title]="g.label + ': ' + g.value"></div> }
                }
              </div>
            }
            <div class="pipe-legend">
              @for (g of segments(); track g.key) {
                <div class="lg-item">
                  <div class="lg-val">{{ g.value }}</div>
                  <div class="lg-label"><i [class]="g.cls"></i>{{ g.label }}</div>
                </div>
              }
            </div>
          </section>

          <!-- 2. Trends & SLA Health -->
          <div class="cols">
            <section class="dash-block">
              <div class="section-title">
                <h2>Incidents per month</h2>
              </div>
              @if (trend().length) { <app-trend-chart [data]="trend()" /> }
              @else { <app-empty-state icon="dashboard" title="No monthly data yet" message="The chart fills in as incidents are opened and resolved." /> }
            </section>

            <section class="dash-block">
              <div class="section-title">
                <h2>SLA health</h2>
                @if (canSeeIncidents) { <a routerLink="/incidents">Open incidents →</a> }
              </div>
              <div class="sla-grid">
                <div class="sla-tile" [class.is-bad]="s.resolutionSlaBreachedCount > 0">
                  <div class="sla-num" [class.bad]="s.resolutionSlaBreachedCount > 0" [class.good]="s.resolutionSlaBreachedCount === 0">{{ s.resolutionSlaBreachedCount }}</div>
                  <div class="sla-label">Resolution deadline missed</div>
                </div>
                <div class="sla-tile" [class.is-bad]="s.responseSlaBreachedCount > 0">
                  <div class="sla-num" [class.bad]="s.responseSlaBreachedCount > 0" [class.good]="s.responseSlaBreachedCount === 0">{{ s.responseSlaBreachedCount }}</div>
                  <div class="sla-label">Response deadline missed</div>
                </div>
                <div class="sla-tile" [class.is-risk]="s.resolutionSlaAtRiskCount > 0">
                  <div class="sla-num" [class.risk]="s.resolutionSlaAtRiskCount > 0">{{ s.resolutionSlaAtRiskCount }}</div>
                  <div class="sla-label">Resolution due within 30 min</div>
                </div>
                <div class="sla-tile" [class.is-risk]="s.responseSlaAtRiskCount > 0">
                  <div class="sla-num" [class.risk]="s.responseSlaAtRiskCount > 0">{{ s.responseSlaAtRiskCount }}</div>
                  <div class="sla-label">Response due within 30 min</div>
                </div>
              </div>
              <div class="sla-avg">
                <span class="sla-avg-label">Average time to resolve</span>
                <span class="sla-avg-val">{{ avg() }}</span>
              </div>
            </section>
          </div>

          <!-- 3. Breakdowns: Priority & Severity -->
          <div class="grid-2">
            <section class="dash-block">
              <div class="section-title">
                <h2>By priority</h2>
              </div>
              <app-breakdown-bars [items]="priority()" />
            </section>
            <section class="dash-block">
              <div class="section-title">
                <h2>By severity</h2>
              </div>
              <app-breakdown-bars [items]="severity()" />
            </section>
          </div>

          <!-- 4. Team Workload -->
          <section class="dash-block">
            <div class="section-title">
              <h2>Team workload</h2>
            </div>
            @if (workload().length === 0) {
              <app-empty-state icon="team" title="No teams have incidents yet" message="Assign incidents to a team and its workload will show here." />
            } @else {
              <div class="table-container">
                <table class="table">
                  <thead><tr><th>Team</th><th class="col-right">Total</th><th class="col-right">Active</th><th>Distribution</th></tr></thead>
                  <tbody>
                    @for (w of workload(); track w.teamId) {
                      <tr>
                        <td class="strong">{{ w.teamName }}</td>
                        <td class="col-right num">{{ w.totalIncidents }}</td>
                        <td class="col-right num">{{ w.assignedIncidents + w.inProgressIncidents + w.newIncidents }}</td>
                        <td>
                          <div class="wl" role="img" [attr.aria-label]="workloadLabel(w)">
                            @if (w.newIncidents) { <span class="s-new" [style.flex-grow]="w.newIncidents"></span> }
                            @if (w.assignedIncidents) { <span class="s-assigned" [style.flex-grow]="w.assignedIncidents"></span> }
                            @if (w.inProgressIncidents) { <span class="s-progress" [style.flex-grow]="w.inProgressIncidents"></span> }
                            @if (w.resolvedIncidents) { <span class="s-resolved" [style.flex-grow]="w.resolvedIncidents"></span> }
                            @if (w.closedIncidents) { <span class="s-closed" [style.flex-grow]="w.closedIncidents"></span> }
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>
        </div>
      }
    </div>
  `,
})
export class DashboardComponent {
  private readonly api = inject(DashboardApi);
  private readonly auth = inject(AuthService);
  protected readonly canSeeIncidents = this.auth.hasAnyRole(ACCESS.incidents);

  protected readonly summary = signal<DashboardSummary | null>(null);
  protected readonly trend = signal<MonthlyTrend[]>([]);
  protected readonly workload = signal<TeamWorkload[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly updatedAt = signal<number | null>(null);
  protected readonly updatedAtIso = computed(() => (this.updatedAt() ? new Date(this.updatedAt()!).toISOString() : null));

  protected readonly segments = computed<Segment[]>(() => {
    const s = this.summary();
    if (!s) return [];
    return [
      { key: 'new', label: 'New', value: s.newIncidents, cls: 's-new' },
      { key: 'assigned', label: 'Assigned', value: s.assignedIncidents, cls: 's-assigned' },
      { key: 'progress', label: 'In progress', value: s.inProgressIncidents, cls: 's-progress' },
      { key: 'resolved', label: 'Resolved', value: s.resolvedIncidents, cls: 's-resolved' },
      { key: 'closed', label: 'Closed', value: s.closedIncidents, cls: 's-closed' },
      { key: 'cancelled', label: 'Cancelled', value: s.cancelledIncidents, cls: 's-cancelled' },
    ];
  });
  protected readonly open = computed(() => {
    const s = this.summary();
    return s ? s.newIncidents + s.assignedIncidents + s.inProgressIncidents : 0;
  });
  protected readonly barLabel = computed(() => this.segments().map((g) => `${g.label} ${g.value}`).join(', '));
  protected readonly avg = computed(() => {
    const m = this.summary()?.averageResolutionTimeMinutes ?? 0;
    return m > 0 ? formatMinutes(m) : 'No resolved incidents yet';
  });

  protected readonly priority = computed<BreakdownItem[]>(() => {
    const s = this.summary();
    return s
      ? [
          { label: 'Critical', value: s.criticalPriorityCount, tone: 'danger' },
          { label: 'High', value: s.highPriorityCount, tone: 'warn' },
          { label: 'Medium', value: s.mediumPriorityCount, tone: 'info' },
          { label: 'Low', value: s.lowPriorityCount, tone: 'muted' },
        ]
      : [];
  });
  protected readonly severity = computed<BreakdownItem[]>(() => {
    const s = this.summary();
    return s
      ? [
          { label: 'Critical', value: s.criticalSeverityCount, tone: 'danger' },
          { label: 'High', value: s.highSeverityCount, tone: 'warn' },
          { label: 'Medium', value: s.mediumSeverityCount, tone: 'info' },
          { label: 'Low', value: s.lowSeverityCount, tone: 'muted' },
        ]
      : [];
  });

  constructor() {
    this.load();
  }

  protected workloadLabel(w: TeamWorkload): string {
    return `${w.newIncidents} new, ${w.assignedIncidents} assigned, ${w.inProgressIncidents} in progress, ${w.resolvedIncidents} resolved, ${w.closedIncidents} closed`;
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({ summary: this.api.summary(), trend: this.api.monthlyTrend(), workload: this.api.teamWorkload() }).subscribe({
      next: (r) => {
        this.summary.set(r.summary);
        this.trend.set(r.trend);
        this.workload.set([...r.workload].sort((a, b) => b.totalIncidents - a.totalIncidents));
        this.updatedAt.set(Date.now());
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }
}
