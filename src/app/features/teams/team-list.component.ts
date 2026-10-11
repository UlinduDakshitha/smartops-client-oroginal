import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { TeamApi } from '../../core/api/team.api';
import { Team, User } from '../../core/models/models';
import { DirectoryService } from '../../core/services/directory.service';
import { ToastService } from '../../core/services/toast.service';
import { toApiError } from '../../core/util/errors';
import { DateTimePipe } from '../../shared/pipes/format.pipes';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { ModalComponent } from '../../shared/ui/modal.component';

@Component({
  selector: 'app-team-form',
  imports: [ReactiveFormsModule, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [title]="team() ? 'Edit team' : 'New team'" size="sm" [busy]="busy()" (closed)="closed.emit()">
      <form id="team-form" [formGroup]="form" (ngSubmit)="submit()" novalidate class="stack">
        @if (error()) { <div class="alert alert-error" role="alert">{{ error() }}</div> }
        <div class="field">
          <label for="t-name">Team name</label>
          <input id="t-name" class="input" formControlName="name" maxlength="100" [class.invalid]="bad('name')" />
          @if (bad('name')) { <span class="error">A team name is required (up to 100 characters).</span> }
        </div>
        <div class="field">
          <label for="t-desc">What does this team handle?</label>
          <textarea id="t-desc" class="textarea" rows="3" formControlName="description" maxlength="500" [class.invalid]="bad('description')"></textarea>
          @if (bad('description')) { <span class="error">A short description is required (up to 500 characters).</span> }
        </div>
      </form>
      <ng-container footer>
        <button type="button" class="btn" [disabled]="busy()" (click)="closed.emit()">Cancel</button>
        <button type="submit" form="team-form" class="btn btn-primary" [disabled]="busy()">
          @if (busy()) { <span class="spinner"></span> } {{ team() ? 'Save changes' : 'Create team' }}
        </button>
      </ng-container>
    </app-modal>
  `,
})
export class TeamFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly api = inject(TeamApi);
  private readonly toast = inject(ToastService);

  readonly team = input<Team | null>(null);
  readonly saved = output<Team>();
  readonly closed = output<void>();
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)]],
    description: ['', [Validators.required, Validators.maxLength(500), Validators.pattern(/\S/)]],
  });

  ngOnInit(): void {
    const t = this.team();
    if (t) this.form.patchValue({ name: t.name, description: t.description });
  }

  protected bad(n: 'name' | 'description'): boolean {
    const c = this.form.controls[n];
    return c.invalid && (c.touched || c.dirty);
  }

  protected submit(): void {
    this.error.set('');
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const body = { name: v.name.trim(), description: v.description.trim() };
    const current = this.team();
    this.busy.set(true);
    (current ? this.api.update(current.id, body) : this.api.create(body)).subscribe({
      next: (res) => { this.toast.success(current ? 'Team updated.' : 'Team created.'); this.saved.emit(res); },
      error: (e) => { this.busy.set(false); this.error.set(toApiError(e).message); },
    });
  }
}

@Component({
  selector: 'app-team-list',
  imports: [RouterLink, IconComponent, EmptyStateComponent, DateTimePipe, TeamFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
    }

    .teams-page {
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

    /* Card-free workspace flow */
    .teams-workspace {
      display: flex;
      flex-direction: column;
      margin-top: 18px;
    }

    /* Flat Toolbar */
    .toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 4px 0 16px;
      border-bottom: 1px solid var(--line);
    }
    .search-wrap {
      position: relative;
      flex: 1 1 320px;
      max-width: 440px;
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

    /* Table - cardless, open modern table */
    .table-wrap {
      overflow-x: auto;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
    }
    .table th {
      padding: 12px 16px;
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
      padding: 14px 16px;
      border-bottom: 1px solid var(--line);
      vertical-align: middle;
    }
    .table tbody tr:last-child td {
      border-bottom: 1px solid var(--line);
    }
    .table tbody tr.clickable {
      cursor: pointer;
      transition: background-color 0.12s ease;
    }
    .table tbody tr.clickable:hover td {
      background: color-mix(in srgb, var(--brand) 4%, transparent);
    }

    /* Column Sizing */
    .th-team, .td-team {
      min-width: 320px;
    }
    .th-lead, .td-lead {
      width: 220px;
    }
    .th-members, .td-members {
      width: 130px;
    }
    .th-created, .td-created {
      width: 160px;
    }
    .th-actions, .col-actions {
      width: 90px;
      text-align: right;
    }

    /* Team cell */
    .team-cell {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .team-avatar {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      background: color-mix(in srgb, var(--brand) 12%, var(--surface));
      border: 1px solid color-mix(in srgb, var(--brand) 22%, transparent);
      color: var(--brand);
      font-size: 13px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      letter-spacing: 0.02em;
    }
    .team-info {
      min-width: 0;
    }
    .team-name {
      font-weight: 650;
      font-size: 14px;
      color: var(--text);
      text-decoration: none;
      transition: color 0.12s ease;
      display: inline-block;
    }
    .team-name:hover {
      color: var(--brand);
    }
    .team-desc {
      font-size: 12.5px;
      color: var(--text-2);
      margin-top: 2px;
      line-height: 1.4;
      max-width: 65ch;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Lead cell */
    .lead-badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 13px;
      font-weight: 550;
      color: var(--text);
    }
    .lead-badge app-icon {
      color: #e59312;
    }
    .lead-unassigned {
      font-size: 12.5px;
      color: var(--text-3);
      font-style: italic;
    }

    /* Members cell */
    .member-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: 999px;
      background: var(--sunken);
      font-size: 12px;
      font-weight: 600;
      color: var(--text-2);
      font-variant-numeric: tabular-nums;
    }

    /* Date cell */
    .date-txt {
      color: var(--text-2);
      font-size: 12.5px;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    /* Empty / No Results */
    .no-results {
      padding: 48px 16px;
      text-align: center;
      color: var(--text-2);
    }
    .no-results p {
      margin: 0 0 12px;
      font-size: 14px;
    }

    @media (max-width: 768px) {
      .teams-page {
        padding: 16px 16px 40px;
      }
      .team-desc {
        max-width: 32ch;
      }
    }
  `,
  template: `
    <div class="teams-page">
      <div class="page-head">
        <div>
          <div class="title-cluster">
            <h1>Teams</h1>
            <span class="total-tag">{{ teams().length }} {{ teams().length === 1 ? 'team' : 'teams' }}</span>
          </div>
          <p class="subtitle">Operational groups responsible for incident ownership and triage.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-primary" (click)="form.set({ team: null })">
            <app-icon name="plus" /> New team
          </button>
        </div>
      </div>

      <div class="teams-workspace">
        <div class="toolbar">
          <div class="search-wrap">
            <app-icon name="search" />
            <input
              type="search"
              class="input search-input"
              placeholder="Search teams by name or description..."
              [value]="search()"
              (input)="search.set($any($event.target).value)"
            />
          </div>
          @if (search()) {
            <button type="button" class="reset-link" (click)="search.set('')">Reset search</button>
          }
        </div>

        @if (error()) {
          <div class="alert alert-error" role="alert" style="margin-top: 16px;">{{ error() }}</div>
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th class="th-team">Team</th>
                  <th class="th-lead">Team Lead</th>
                  <th class="th-members">Members</th>
                  <th class="th-created">Created</th>
                  <th class="th-actions"><span class="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                @if (loading()) {
                  @for (n of [1,2,3,4]; track n) {
                    <tr>
                      <td colspan="5"><span class="skeleton" style="height:26px; border-radius: 4px;"></span></td>
                    </tr>
                  }
                } @else {
                  @for (t of filteredTeams(); track t.id) {
                    <tr class="clickable" (click)="open(t)">
                      <td class="td-team">
                        <div class="team-cell">
                          <span class="team-avatar">{{ initials(t.name) }}</span>
                          <div class="team-info">
                            <a class="team-name" [routerLink]="['/teams', t.id]" (click)="$event.stopPropagation()">
                              {{ t.name }}
                            </a>
                            <div class="team-desc">{{ t.description }}</div>
                          </div>
                        </div>
                      </td>
                      <td class="td-lead">
                        @if (t.teamLeadId) {
                          <span class="lead-badge">
                            <app-icon name="crown" />
                            <span>{{ dir.userName(t.teamLeadId) }}</span>
                          </span>
                        } @else {
                          <span class="lead-unassigned">Unassigned lead</span>
                        }
                      </td>
                      <td class="td-members">
                        <span class="member-pill">
                          <app-icon name="team" [size]="13" />
                          <span>{{ counts()[t.id] ?? 0 }}</span>
                        </span>
                      </td>
                      <td class="td-created">
                        <span class="date-txt">{{ t.createdAt | dt: false }}</span>
                      </td>
                      <td class="col-actions">
                        <button
                          type="button"
                          class="btn btn-sm btn-quiet"
                          (click)="$event.stopPropagation(); form.set({ team: t })"
                        >
                          <app-icon name="edit" /> Edit
                        </button>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>

          @if (!loading() && teams().length === 0) {
            <app-empty-state icon="team" title="No teams yet" message="Create a team, add members, then assign incidents to it.">
              <button type="button" class="btn btn-primary" (click)="form.set({ team: null })">Create team</button>
            </app-empty-state>
          } @else if (!loading() && teams().length > 0 && filteredTeams().length === 0) {
            <div class="no-results">
              <p>No teams match "<strong>{{ search() }}</strong>".</p>
              <button type="button" class="btn btn-sm btn-quiet" (click)="search.set('')">Clear search</button>
            </div>
          }
        }
      </div>
    </div>

    @if (form(); as f) {
      <app-team-form [team]="f.team" (closed)="form.set(null)" (saved)="onSaved()" />
    }
  `,
})
export class TeamListComponent {
  private readonly api = inject(TeamApi);
  private readonly router = inject(Router);
  protected readonly dir = inject(DirectoryService);

  protected readonly teams = signal<Team[]>([]);
  protected readonly counts = signal<Record<string, number | undefined>>({});
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly form = signal<{ team: Team | null } | null>(null);
  protected readonly search = signal('');

  protected readonly filteredTeams = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.teams();
    return this.teams().filter(
      (t) => t.name.toLowerCase().includes(q) || (t.description?.toLowerCase().includes(q) ?? false)
    );
  });

  constructor() {
    this.load();
  }

  protected initials(name: string): string {
    return (name.match(/\b\w/g) ?? ['T']).slice(0, 2).join('').toUpperCase();
  }

  private load(): void {
    this.api.list().subscribe({
      next: (list) => {
        this.teams.set([...list].sort((a, b) => a.name.localeCompare(b.name)));
        this.loading.set(false);
        if (list.length) {
          forkJoin(list.map((t) => this.api.members(t.id).pipe(catchError(() => of(null as User[] | null))))).subscribe((res) =>
            this.counts.set(Object.fromEntries(list.flatMap((t, i) => (res[i] ? [[t.id, res[i]!.length]] : [])))),
          );
        }
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }

  protected open(t: Team): void {
    void this.router.navigate(['/teams', t.id]);
  }

  protected onSaved(): void {
    this.form.set(null);
    this.dir.load(true);
    this.load();
  }
}
