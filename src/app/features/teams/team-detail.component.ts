import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, catchError, of } from 'rxjs';
import { TeamApi } from '../../core/api/team.api';
import { UserApi } from '../../core/api/user.api';
import { ROLE, Team, User } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { DirectoryService } from '../../core/services/directory.service';
import { ToastService } from '../../core/services/toast.service';
import { toApiError } from '../../core/util/errors';
import { DateTimePipe } from '../../shared/pipes/format.pipes';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { TeamFormComponent } from './team-list.component';

@Component({
  selector: 'app-team-detail',
  imports: [RouterLink, FormsModule, IconComponent, EmptyStateComponent, DateTimePipe, TeamFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
    }

    .team-detail-page {
      max-width: 100%;
      padding: 24px 32px 56px;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      color: var(--text-2);
      font-size: 13px;
      font-weight: 560;
      margin-bottom: 18px;
      text-decoration: none;
      transition: color 0.12s ease;
    }
    .back-link:hover {
      color: var(--brand);
    }

    /* Head */
    .team-header-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .team-avatar-lg {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      background: color-mix(in srgb, var(--brand) 12%, var(--surface));
      border: 1px solid color-mix(in srgb, var(--brand) 24%, transparent);
      color: var(--brand);
      font-size: 16px;
      font-weight: 750;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      letter-spacing: 0.02em;
    }
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
      max-width: 75ch;
    }

    /* Layout - completely cardless 2-column workspace */
    .detail-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 340px;
      gap: 40px;
      align-items: start;
      margin-top: 24px;
    }
    @media (max-width: 1024px) {
      .detail-layout {
        grid-template-columns: 1fr;
        gap: 32px;
      }
    }

    /* Section Head */
    .section-head {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--line);
    }
    .section-head h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: var(--text);
    }
    .section-tag {
      font-size: 11.5px;
      font-weight: 600;
      padding: 1px 7px;
      border-radius: 999px;
      background: var(--sunken);
      color: var(--text-2);
      font-variant-numeric: tabular-nums;
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
    .table tbody tr:last-child td {
      border-bottom: 1px solid var(--line);
    }
    .table tbody tr:hover td {
      background: color-mix(in srgb, var(--brand) 3%, transparent);
    }

    /* Member column */
    .th-member, .td-member {
      min-width: 240px;
    }
    .th-status, .td-status {
      width: 120px;
    }
    .th-actions, .col-actions {
      width: 90px;
      text-align: right;
    }

    .person {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .member-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--sunken);
      color: var(--text-2);
      font-size: 11.5px;
      font-weight: 650;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .person-meta {
      min-width: 0;
    }
    .person-name {
      display: flex;
      align-items: center;
      gap: 7px;
      font-weight: 600;
      color: var(--text);
      font-size: 13.5px;
    }
    .name-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .lead-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 1px 7px;
      border-radius: 999px;
      background: var(--warn-soft);
      color: var(--warn);
      font-size: 11px;
      font-weight: 650;
    }
    .person-email {
      font-size: 12px;
      color: var(--text-3);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Sidebar - flat, seamless controls */
    .sidebar-col {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .sidebar-block {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-bottom: 22px;
      border-bottom: 1px solid var(--line);
    }
    .block-title {
      margin: 0;
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.01em;
    }
    .current-lead {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: var(--r-md);
      background: var(--sunken);
    }
    .lead-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--warn-soft);
      color: var(--warn);
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .lead-details {
      min-width: 0;
    }
    .lead-name-text {
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
    }
    .lead-tag {
      font-size: 11px;
      color: var(--text-3);
    }
    .muted-note {
      margin: 0;
      font-size: 13px;
      color: var(--text-3);
      font-style: italic;
    }
    .field-label {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-2);
      margin-bottom: 6px;
      display: block;
    }
    .inline-control {
      display: flex;
      gap: 8px;
    }
    .inline-control .select {
      flex: 1;
      min-width: 0;
      height: 34px;
      font-size: 13px;
    }
    .inline-control .btn {
      height: 34px;
      padding: 0 14px;
      font-size: 13px;
    }
    .field-hint {
      display: block;
      margin-top: 4px;
      font-size: 11.5px;
      color: var(--text-3);
    }
    .btn-remove-lead {
      align-self: flex-start;
      margin-top: 2px;
      font-size: 12px;
    }
    .meta-footer {
      font-size: 12px;
      color: var(--text-3);
    }

    @media (max-width: 768px) {
      .team-detail-page {
        padding: 16px 16px 40px;
      }
      .team-avatar-lg {
        width: 40px;
        height: 40px;
        font-size: 14px;
      }
    }
  `,
  template: `
    <div class="team-detail-page">
      <a class="back-link" routerLink="/teams"><app-icon name="arrow-left" [size]="14" /> All teams</a>

      @if (loading() && !team()) {
        <span class="skeleton" style="height:34px;width:40%"></span>
      } @else if (error() && !team()) {
        <app-empty-state icon="alert-circle" title="Could not load this team" [message]="error()">
          <a class="btn btn-primary" routerLink="/teams">Back to teams</a>
        </app-empty-state>
      } @else if (team(); as t) {
        <div class="page-head">
          <div class="team-header-info">
            <div class="team-avatar-lg">{{ teamInitials(t.name) }}</div>
            <div>
              <div class="title-cluster">
                <h1>{{ t.name }}</h1>
                <span class="total-tag">{{ members().length }} {{ members().length === 1 ? 'member' : 'members' }}</span>
              </div>
              <p class="subtitle">{{ t.description }}</p>
            </div>
          </div>
          <div class="page-actions">
            <button type="button" class="btn" (click)="editing.set(true)"><app-icon name="edit" /> Edit team</button>
          </div>
        </div>

        <div class="detail-layout">
          <!-- Left: Members Table (Cardless, open table) -->
          <div class="main-col">
            <div class="section-head">
              <h2>Members</h2>
              <span class="section-tag">{{ members().length }}</span>
            </div>

            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th class="th-member">Member</th>
                    <th class="th-status">Status</th>
                    <th class="th-actions"><span class="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (m of members(); track m.id) {
                    <tr>
                      <td class="td-member">
                        <div class="person">
                          <span class="member-avatar">{{ userInitials(m) }}</span>
                          <div class="person-meta">
                            <div class="person-name">
                              <span class="name-text">{{ m.fullName }}</span>
                              @if (m.id === t.teamLeadId) {
                                <span class="lead-badge"><app-icon name="crown" [size]="12" /> Lead</span>
                              }
                            </div>
                            <div class="person-email">{{ m.email }}</div>
                          </div>
                        </div>
                      </td>
                      <td class="td-status">
                        @if (m.isActive) {
                          <span class="badge badge-ok">Active</span>
                        } @else {
                          <span class="badge badge-muted">Inactive</span>
                        }
                      </td>
                      <td class="col-actions">
                        <button
                          type="button"
                          class="btn btn-sm btn-danger-quiet"
                          [disabled]="m.id === t.teamLeadId || busy()"
                          [title]="m.id === t.teamLeadId ? 'Remove as team lead first' : ''"
                          (click)="remove(t, m)"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            @if (members().length === 0) {
              <app-empty-state icon="team" title="No members yet" message="Add people so incidents can be assigned to them." />
            }
          </div>

          <!-- Right: Controls & Management (Cardless, flat blocks) -->
          <aside class="sidebar-col">
            <div class="sidebar-block">
              <h3 class="block-title">Team Lead</h3>
              @if (t.teamLeadId) {
                <div class="current-lead">
                  <span class="lead-avatar"><app-icon name="crown" /></span>
                  <div class="lead-details">
                    <div class="lead-name-text">{{ dir.userName(t.teamLeadId) }}</div>
                    <div class="lead-tag">Assigned Lead</div>
                  </div>
                </div>
              } @else {
                <p class="muted-note">No team lead assigned.</p>
              }

              <div class="field">
                <label for="lead" class="field-label">{{ t.teamLeadId ? 'Change team lead' : 'Assign team lead' }}</label>
                <div class="inline-control">
                  <select id="lead" class="select" [ngModel]="leadPick()" (ngModelChange)="leadPick.set($event)" [disabled]="members().length === 0">
                    <option value="" disabled>Select a member</option>
                    @for (m of eligibleLeads(); track m.id) { <option [value]="m.id">{{ m.fullName }}</option> }
                  </select>
                  <button type="button" class="btn btn-primary" [disabled]="!leadPick() || busy()" (click)="setLead(t)">Set</button>
                </div>
                <span class="field-hint">The lead must be an active member of this team.</span>
              </div>

              @if (t.teamLeadId) {
                <button type="button" class="btn btn-danger-quiet btn-remove-lead" [disabled]="busy()" (click)="clearLead(t)">Remove team lead</button>
              }
            </div>

            <div class="sidebar-block">
              <h3 class="block-title">Add Member</h3>
              @if (isAdmin) {
                <div class="field">
                  <label for="add" class="field-label">Select user</label>
                  <div class="inline-control">
                    <select id="add" class="select" [ngModel]="addPick()" (ngModelChange)="addPick.set($event)">
                      <option value="" disabled>Select a user</option>
                      @for (u of candidates(); track u.id) { <option [value]="u.id">{{ u.fullName }}</option> }
                    </select>
                    <button type="button" class="btn btn-primary" [disabled]="!addPick() || busy()" (click)="add(t)">Add</button>
                  </div>
                  @if (candidates().length === 0 && usersLoaded()) {
                    <span class="field-hint">Everyone active is already in this team.</span>
                  }
                </div>
              } @else {
                <p class="muted-note small">Only administrators can browse the user list to add members.</p>
              }
            </div>

            <div class="meta-footer">
              Created {{ t.createdAt | dt }}
            </div>
          </aside>
        </div>

        @if (editing()) {
          <app-team-form [team]="t" (closed)="editing.set(false)" (saved)="onEdited($event)" />
        }
      }
    </div>
  `,
})
export class TeamDetailComponent {
  private readonly api = inject(TeamApi);
  private readonly userApi = inject(UserApi);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  protected readonly dir = inject(DirectoryService);

  readonly id = input.required<string>();
  protected readonly isAdmin = this.auth.roles().includes(ROLE.Administrator);

  protected readonly team = signal<Team | null>(null);
  protected readonly members = signal<User[]>([]);
  private readonly allUsers = signal<User[]>([]);
  protected readonly usersLoaded = signal(false);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly editing = signal(false);
  protected readonly leadPick = signal('');
  protected readonly addPick = signal('');

  protected readonly eligibleLeads = computed(() => this.members().filter((m) => m.isActive && m.id !== this.team()?.teamLeadId));
  protected readonly candidates = computed(() => {
    const inTeam = new Set(this.members().map((m) => m.id));
    return this.allUsers().filter((u) => u.isActive && !inTeam.has(u.id));
  });

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.load(id));
    });
    if (this.isAdmin) {
      this.userApi.list().pipe(catchError(() => of({ users: [] as User[], totalCount: 0 }))).subscribe((r) => {
        this.allUsers.set([...r.users].sort((a, b) => a.fullName.localeCompare(b.fullName)));
        this.usersLoaded.set(true);
      });
    }
  }

  protected userInitials(u: User): string {
    return (u.fullName.match(/\b\w/g) ?? ['?']).slice(0, 2).join('').toUpperCase();
  }

  protected teamInitials(name: string): string {
    return (name.match(/\b\w/g) ?? ['T']).slice(0, 2).join('').toUpperCase();
  }

  private load(id: string): void {
    this.loading.set(true);
    this.error.set('');
    this.api.get(id).subscribe({
      next: (t) => {
        this.team.set(t);
        this.loading.set(false);
        this.leadPick.set('');
        this.api.members(id).subscribe({ next: (m) => this.members.set(m), error: (e) => this.toast.fromError(e) });
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }

  private run(call: Observable<unknown>, success: string, t: Team): void {
    this.busy.set(true);
    call.subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success(success);
        this.addPick.set('');
        this.dir.load(true);
        this.load(t.id);
      },
      error: (e) => { this.busy.set(false); this.toast.fromError(e); },
    });
  }

  protected add(t: Team): void { this.run(this.api.addMember(t.id, this.addPick()), 'Member added.', t); }
  protected setLead(t: Team): void { this.run(this.api.assignLead(t.id, this.leadPick()), 'Team lead updated.', t); }

  protected async clearLead(t: Team): Promise<void> {
    const ok = await this.confirm.ask({ title: 'Remove team lead?', message: `${t.name} will have no lead until you pick one.`, confirmText: 'Remove lead', danger: true });
    if (ok) this.run(this.api.removeLead(t.id), 'Team lead removed.', t);
  }

  protected async remove(t: Team, m: User): Promise<void> {
    const ok = await this.confirm.ask({ title: `Remove ${m.fullName}?`, message: `They will no longer be part of ${t.name}.`, confirmText: 'Remove', danger: true });
    if (ok) this.run(this.api.removeMember(t.id, m.id), 'Member removed.', t);
  }

  protected onEdited(t: Team): void {
    this.editing.set(false);
    this.team.set(t);
    this.dir.load(true);
  }
}
