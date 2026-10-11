import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { RoleApi } from '../../core/api/misc.api';
import { UserApi } from '../../core/api/user.api';
import { ROLE, Role, User } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { DirectoryService } from '../../core/services/directory.service';
import { ToastService } from '../../core/services/toast.service';
import { toApiError } from '../../core/util/errors';
import { DateTimePipe } from '../../shared/pipes/format.pipes';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { ModalComponent } from '../../shared/ui/modal.component';

@Component({
  selector: 'app-user-form',
  imports: [ReactiveFormsModule, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [title]="user() ? 'Edit user' : 'New user'" size="sm" [busy]="busy()" (closed)="closed.emit()">
      <form id="user-form" [formGroup]="form" (ngSubmit)="submit()" novalidate class="stack">
        @if (error()) { <div class="alert alert-error" role="alert">{{ error() }}</div> }
        <div class="field">
          <label for="u-name">Full name</label>
          <input id="u-name" class="input" formControlName="fullName" maxlength="100" [class.invalid]="bad('fullName')" />
          @if (bad('fullName')) { <span class="error">Enter a name (up to 100 characters).</span> }
        </div>
        <div class="field">
          <label for="u-email">Email</label>
          <input id="u-email" class="input" type="email" formControlName="email" [class.invalid]="bad('email')" />
          @if (bad('email')) { <span class="error">Enter a valid email address.</span> }
        </div>
        @if (!user()) {
          <div class="field">
            <label for="u-pass">Temporary password</label>
            <input id="u-pass" class="input" type="password" formControlName="password" autocomplete="new-password" [class.invalid]="bad('password')" />
            <span class="hint">At least 8 characters. Share it with the user securely.</span>
          </div>
          <div class="field">
            <label for="u-role">Role</label>
            <select id="u-role" class="select" formControlName="roleId" [class.invalid]="bad('roleId')">
              <option value="" disabled>Choose a role</option>
              @for (r of roles(); track r.id) { <option [value]="r.id">{{ r.name }}</option> }
            </select>
            <span class="hint">Administrator accounts cannot be created here.</span>
          </div>
        }
      </form>
      <ng-container footer>
        <button type="button" class="btn" [disabled]="busy()" (click)="closed.emit()">Cancel</button>
        <button type="submit" form="user-form" class="btn btn-primary" [disabled]="busy()">
          @if (busy()) { <span class="spinner"></span> } {{ user() ? 'Save changes' : 'Create user' }}
        </button>
      </ng-container>
    </app-modal>
  `,
})
export class UserFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly api = inject(UserApi);
  private readonly toast = inject(ToastService);

  readonly user = input<User | null>(null);
  readonly roles = input<Role[]>([]);
  readonly saved = output<void>();
  readonly closed = output<void>();
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected readonly form = this.fb.group({
    fullName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)]],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    roleId: [''],
  });

  ngOnInit(): void {
    const u = this.user();
    if (u) this.form.patchValue({ fullName: u.fullName, email: u.email });
    else {
      this.form.controls.password.addValidators([Validators.required, Validators.minLength(8)]);
      this.form.controls.roleId.addValidators(Validators.required);
    }
  }

  protected bad(n: 'fullName' | 'email' | 'password' | 'roleId'): boolean {
    const c = this.form.controls[n];
    return c.invalid && (c.touched || c.dirty);
  }

  protected submit(): void {
    this.error.set('');
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const current = this.user();
    this.busy.set(true);
    const call = current
      ? this.api.update(current.id, { fullName: v.fullName.trim(), email: v.email.trim() })
      : this.api.create({ fullName: v.fullName.trim(), email: v.email.trim(), password: v.password, roleId: v.roleId });
    call.subscribe({
      next: () => { this.toast.success(current ? 'User updated.' : 'User created.'); this.saved.emit(); },
      error: (e) => { this.busy.set(false); this.error.set(toApiError(e).message); },
    });
  }
}

@Component({
  selector: 'app-add-role-dialog',
  imports: [FormsModule, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal title="Add a role" size="sm" [busy]="busy()" (closed)="closed.emit()">
      <div class="stack">
        <p class="muted">{{ user().fullName }} can hold several roles. Roles can be added here but not removed.</p>
        @if (error()) { <div class="alert alert-error" role="alert">{{ error() }}</div> }
        @if (available().length === 0) {
          <p>This user already has every role.</p>
        } @else {
          <div class="field">
            <label for="ar-role">Role</label>
            <select id="ar-role" class="select" [ngModel]="roleId()" (ngModelChange)="roleId.set($event)">
              <option value="" disabled>Choose a role</option>
              @for (r of available(); track r.id) { <option [value]="r.id">{{ r.name }}</option> }
            </select>
            @if (selected()?.description) { <span class="hint">{{ selected()?.description }}</span> }
          </div>
        }
      </div>
      <ng-container footer>
        <button type="button" class="btn" [disabled]="busy()" (click)="closed.emit()">Cancel</button>
        <button type="button" class="btn btn-primary" [disabled]="busy() || !roleId()" (click)="save()">
          @if (busy()) { <span class="spinner"></span> } Add role
        </button>
      </ng-container>
    </app-modal>
  `,
})
export class AddRoleDialogComponent {
  private readonly api = inject(UserApi);
  private readonly toast = inject(ToastService);

  readonly user = input.required<User>();
  readonly allRoles = input<Role[]>([]);
  readonly current = input<Role[]>([]);
  readonly saved = output<void>();
  readonly closed = output<void>();

  protected readonly roleId = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly available = computed(() => this.allRoles().filter((r) => !this.current().some((c) => c.id === r.id)));
  protected readonly selected = computed(() => this.available().find((r) => r.id === this.roleId()));

  protected save(): void {
    this.busy.set(true);
    this.api.assignRole(this.user().id, this.roleId()).subscribe({
      next: () => { this.toast.success('Role added.'); this.saved.emit(); },
      error: (e) => { this.busy.set(false); this.error.set(toApiError(e).message); },
    });
  }
}

@Component({
  selector: 'app-user-list',
  imports: [IconComponent, EmptyStateComponent, DateTimePipe, UserFormComponent, AddRoleDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
    }

    .users-page {
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
    .users-workspace {
      display: flex;
      flex-direction: column;
      margin-top: 18px;
    }

    /* Flat Toolbar */
    .toolbar {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
      padding: 4px 0 16px;
      border-bottom: 1px solid var(--line);
    }
    .search-wrap {
      position: relative;
      flex: 1 1 280px;
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

    .status-ribbon {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .status-chip {
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
    .table tbody tr:hover td {
      background: color-mix(in srgb, var(--brand) 4%, transparent);
    }
    .row-inactive {
      opacity: 0.65;
    }

    /* Column Sizing */
    .th-user, .td-user {
      min-width: 280px;
    }
    .th-roles, .td-roles {
      min-width: 200px;
    }
    .th-status, .td-status {
      width: 120px;
    }
    .th-joined, .td-joined {
      width: 140px;
    }
    .th-actions, .col-actions {
      width: 240px;
      text-align: right;
    }

    /* Person */
    .person {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: color-mix(in srgb, var(--brand) 12%, var(--surface));
      border: 1px solid color-mix(in srgb, var(--brand) 22%, transparent);
      color: var(--brand);
      font-size: 12px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      letter-spacing: 0.02em;
    }
    .avatar-inactive {
      background: var(--sunken);
      border-color: var(--line-2);
      color: var(--text-3);
    }
    .user-meta {
      min-width: 0;
    }
    .user-name {
      display: flex;
      align-items: center;
      gap: 7px;
      font-weight: 650;
      color: var(--text);
      font-size: 13.5px;
    }
    .name-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .you-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      padding: 1px 7px;
      border-radius: 999px;
      background: var(--sunken);
      color: var(--text-2);
    }
    .user-email {
      font-size: 12px;
      color: var(--text-2);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-top: 2px;
    }

    /* Roles */
    .roles-wrap {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      align-items: center;
    }
    .role-badge {
      display: inline-flex;
      align-items: center;
      font-size: 11.5px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--brand-soft);
      color: var(--brand-ink);
      border: 1px solid color-mix(in srgb, var(--brand) 20%, transparent);
    }
    .role-badge.admin-role {
      background: var(--violet-soft);
      color: var(--violet);
      border-color: color-mix(in srgb, var(--violet) 25%, transparent);
    }
    .no-role {
      font-size: 12px;
      color: var(--text-3);
      font-style: italic;
    }

    .date-txt {
      color: var(--text-2);
      font-size: 12.5px;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .action-buttons {
      display: flex;
      gap: 6px;
      justify-content: flex-end;
      align-items: center;
    }

    .empty-wrap {
      padding: 36px 0;
    }

    @media (max-width: 768px) {
      .users-page {
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
    <div class="users-page">
      <div class="page-head">
        <div>
          <div class="title-cluster">
            <h1>Users</h1>
            <span class="total-tag">{{ users().length }} {{ users().length === 1 ? 'user' : 'users' }}</span>
          </div>
          <p class="subtitle">Manage user accounts, system roles, and account access permissions.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-primary" (click)="dialog.set({ kind: 'form', user: null })">
            <app-icon name="user-plus" /> New user
          </button>
        </div>
      </div>

      <div class="users-workspace">
        <div class="toolbar">
          <div class="search-wrap">
            <app-icon name="search" />
            <input
              class="input search-input"
              type="search"
              placeholder="Search users by name or email..."
              aria-label="Search users"
              [value]="term()"
              (input)="term.set($any($event.target).value)"
            />
          </div>
          <div class="status-ribbon" role="group" aria-label="Filter by status">
            <button
              type="button"
              class="status-chip"
              [class.active]="status() === 'all'"
              (click)="status.set('all')"
            >
              All ({{ users().length }})
            </button>
            <button
              type="button"
              class="status-chip"
              [class.active]="status() === 'active'"
              (click)="status.set('active')"
            >
              Active ({{ activeCount() }})
            </button>
            <button
              type="button"
              class="status-chip"
              [class.active]="status() === 'inactive'"
              (click)="status.set('inactive')"
            >
              Inactive ({{ inactiveCount() }})
            </button>
          </div>
          @if (term()) {
            <button type="button" class="reset-link" (click)="term.set('')">Reset search</button>
          }
        </div>

        @if (error()) {
          <div class="alert alert-error" role="alert" style="margin-top: 16px;">{{ error() }}</div>
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th class="th-user">User</th>
                  <th class="th-roles">Roles</th>
                  <th class="th-status">Status</th>
                  <th class="th-joined">Joined</th>
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
                  @for (u of visible(); track u.id) {
                    <tr [class.row-inactive]="!u.isActive">
                      <td class="td-user">
                        <div class="person">
                          <span class="user-avatar" [class.avatar-inactive]="!u.isActive">{{ initials(u) }}</span>
                          <div class="user-meta">
                            <div class="user-name">
                              <span class="name-text">{{ u.fullName }}</span>
                              @if (isMe(u)) {
                                <span class="you-badge">You</span>
                              }
                            </div>
                            <div class="user-email">{{ u.email }}</div>
                          </div>
                        </div>
                      </td>
                      <td class="td-roles">
                        <div class="roles-wrap">
                          @for (r of rolesOf(u.id); track r.id) {
                            <span class="role-badge" [class.admin-role]="r.name === 'Administrator'" [title]="r.description">
                              {{ r.name }}
                            </span>
                          }
                          @empty {
                            @if (!rolesLoaded()) {
                              <span class="skeleton" style="height:20px; width:80px; border-radius: 999px;"></span>
                            } @else {
                              <span class="no-role">None</span>
                            }
                          }
                        </div>
                      </td>
                      <td class="td-status">
                        @if (u.isActive) {
                          <span class="badge badge-ok">Active</span>
                        } @else {
                          <span class="badge badge-muted">Inactive</span>
                        }
                      </td>
                      <td class="td-joined">
                        <span class="date-txt">{{ u.createdAt | dt: false }}</span>
                      </td>
                      <td class="col-actions">
                        <div class="action-buttons">
                          <button
                            type="button"
                            class="btn btn-sm btn-quiet"
                            (click)="dialog.set({ kind: 'form', user: u })"
                          >
                            <app-icon name="edit" /> Edit
                          </button>
                          <button
                            type="button"
                            class="btn btn-sm btn-quiet"
                            (click)="dialog.set({ kind: 'role', user: u })"
                          >
                            <app-icon name="shield" /> Add role
                          </button>
                          @if (u.isActive) {
                            <button
                              type="button"
                              class="btn btn-sm btn-danger-quiet"
                              [disabled]="isMe(u) || busyId() === u.id"
                              [title]="isMe(u) ? 'You cannot deactivate yourself' : ''"
                              (click)="toggleActive(u)"
                            >
                              Deactivate
                            </button>
                          } @else {
                            <button
                              type="button"
                              class="btn btn-sm"
                              [disabled]="busyId() === u.id"
                              (click)="toggleActive(u)"
                            >
                              Activate
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>

          @if (!loading() && visible().length === 0) {
            <div class="empty-wrap">
              <app-empty-state icon="user" title="No users found" message="Change the search or status filter." />
            </div>
          }
        }
      </div>
    </div>

    @if (dialog(); as d) {
      @if (d.kind === 'form') {
        <app-user-form [user]="d.user" [roles]="creatableRoles()" (closed)="dialog.set(null)" (saved)="onSaved()" />
      } @else if (d.user) {
        <app-add-role-dialog [user]="d.user" [allRoles]="roles()" [current]="rolesOf(d.user.id)" (closed)="dialog.set(null)" (saved)="onRoleAdded(d.user.id)" />
      }
    }
  `,
})
export class UserListComponent {
  private readonly api = inject(UserApi);
  private readonly roleApi = inject(RoleApi);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly dir = inject(DirectoryService);

  protected readonly users = signal<User[]>([]);
  protected readonly roles = signal<Role[]>([]);
  private readonly userRoles = signal<Record<string, Role[]>>({});
  protected readonly loading = signal(true);
  protected readonly rolesLoaded = signal(false);
  protected readonly error = signal('');
  protected readonly term = signal('');
  protected readonly status = signal<'all' | 'active' | 'inactive'>('all');
  protected readonly busyId = signal<string | null>(null);
  protected readonly dialog = signal<{ kind: 'form' | 'role'; user: User | null } | null>(null);

  protected readonly creatableRoles = computed(() => this.roles().filter((r) => r.name !== ROLE.Administrator));
  protected readonly activeCount = computed(() => this.users().filter((u) => u.isActive).length);
  protected readonly inactiveCount = computed(() => this.users().filter((u) => !u.isActive).length);
  protected readonly visible = computed(() => {
    const t = this.term().trim().toLowerCase();
    const s = this.status();
    return this.users().filter(
      (u) => (s === 'all' || (s === 'active') === u.isActive) && (!t || u.fullName.toLowerCase().includes(t) || u.email.toLowerCase().includes(t)),
    );
  });

  constructor() {
    this.load();
  }

  protected rolesOf = (id: string): Role[] => this.userRoles()[id] ?? [];
  protected isMe = (u: User) => u.id === this.auth.user()?.id;
  protected initials = (u: User) => (u.fullName.match(/\b\w/g) ?? ['?']).slice(0, 2).join('').toUpperCase();

  private load(): void {
    this.loading.set(true);
    forkJoin({ list: this.api.list(), roles: this.roleApi.list().pipe(catchError(() => of([] as Role[]))) }).subscribe({
      next: ({ list, roles }) => {
        this.users.set([...list.users].sort((a, b) => a.fullName.localeCompare(b.fullName)));
        this.roles.set(roles);
        this.loading.set(false);
        this.loadRoles(list.users);
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }

  /** The list endpoint has no roles, so fetch each user's roles in parallel. */
  private loadRoles(users: User[]): void {
    if (users.length === 0) { this.rolesLoaded.set(true); return; }
    forkJoin(users.map((u) => this.api.roles(u.id).pipe(catchError(() => of([] as Role[]))))).subscribe((lists) => {
      this.userRoles.set(Object.fromEntries(users.map((u, i) => [u.id, lists[i]])));
      this.rolesLoaded.set(true);
    });
  }

  protected onSaved(): void {
    this.dialog.set(null);
    this.dir.load(true);
    this.load();
  }

  protected onRoleAdded(userId: string): void {
    this.dialog.set(null);
    this.api.roles(userId).subscribe((list) => this.userRoles.update((m) => ({ ...m, [userId]: list })));
  }

  protected async toggleActive(u: User): Promise<void> {
    if (u.isActive) {
      const ok = await this.confirm.ask({
        title: `Deactivate ${u.fullName}?`,
        message: 'They will not be able to sign in or be assigned incidents. You can activate them again later.',
        confirmText: 'Deactivate',
        danger: true,
      });
      if (!ok) return;
    }
    this.busyId.set(u.id);
    (u.isActive ? this.api.deactivate(u.id) : this.api.activate(u.id)).subscribe({
      next: () => {
        this.users.update((list) => list.map((x) => (x.id === u.id ? { ...x, isActive: !u.isActive } : x)));
        this.toast.success(u.isActive ? `${u.fullName} deactivated.` : `${u.fullName} activated.`);
        this.busyId.set(null);
      },
      error: (e) => { this.busyId.set(null); this.toast.fromError(e); },
    });
  }
}
