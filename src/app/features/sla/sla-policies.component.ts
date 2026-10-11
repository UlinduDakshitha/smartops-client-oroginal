import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { SlaApi } from '../../core/api/misc.api';
import { LEVEL_LABEL, PRIORITIES, Priority, SlaPolicy } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';
import { formatMinutes } from '../../core/util/dates';
import { toApiError } from '../../core/util/errors';
import { DateTimePipe, DurationPipe } from '../../shared/pipes/format.pipes';
import { LevelBadgeComponent } from '../../shared/ui/badges.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { ModalComponent } from '../../shared/ui/modal.component';

function resolutionAfterResponse(g: AbstractControl): ValidationErrors | null {
  const r = Number(g.get('responseTimeMinutes')?.value);
  const s = Number(g.get('resolutionTimeMinutes')?.value);
  return r > 0 && s > 0 && s <= r ? { order: true } : null;
}

@Component({
  selector: 'app-sla-form',
  imports: [ReactiveFormsModule, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [title]="policy() ? 'Edit SLA policy' : 'New SLA policy'" [busy]="busy()" (closed)="closed.emit()">
      <form id="sla-form" [formGroup]="form" (ngSubmit)="submit()" novalidate class="stack">
        @if (error()) { <div class="alert alert-error" role="alert">{{ error() }}</div> }
        <div class="form-grid">
          <div class="field full">
            <label for="sla-name">Name</label>
            <input id="sla-name" class="input" formControlName="name" maxlength="100" [class.invalid]="bad('name')" />
            @if (bad('name')) { <span class="error">A name is required (up to 100 characters).</span> }
          </div>
          <div class="field full">
            <label for="sla-prio">Applies to priority</label>
            <select id="sla-prio" class="select" formControlName="priority">
              @for (p of priorities; track p) { <option [ngValue]="p">{{ label(p) }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="sla-resp">First response within (minutes)</label>
            <input id="sla-resp" class="input" type="number" min="1" formControlName="responseTimeMinutes" [class.invalid]="bad('responseTimeMinutes')" />
            <span class="hint">{{ pretty(form.controls.responseTimeMinutes.value) }}</span>
          </div>
          <div class="field">
            <label for="sla-res">Resolution within (minutes)</label>
            <input id="sla-res" class="input" type="number" min="1" formControlName="resolutionTimeMinutes" [class.invalid]="bad('resolutionTimeMinutes') || form.hasError('order')" />
            <span class="hint">{{ pretty(form.controls.resolutionTimeMinutes.value) }}</span>
          </div>
        </div>
        @if (form.hasError('order') && form.controls.resolutionTimeMinutes.touched) {
          <span class="error">Resolution time must be longer than response time.</span>
        }
        @if (policy()) {
          <div class="alert"><span>Changes apply to incidents created from now on. Open incidents keep the deadlines they were created with.</span></div>
        }
      </form>
      <ng-container footer>
        <button type="button" class="btn" [disabled]="busy()" (click)="closed.emit()">Cancel</button>
        <button type="submit" form="sla-form" class="btn btn-primary" [disabled]="busy()">
          @if (busy()) { <span class="spinner"></span> } {{ policy() ? 'Save changes' : 'Create policy' }}
        </button>
      </ng-container>
    </app-modal>
  `,
})
export class SlaFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly api = inject(SlaApi);
  private readonly toast = inject(ToastService);

  readonly policy = input<SlaPolicy | null>(null);
  readonly saved = output<SlaPolicy>();
  readonly closed = output<void>();

  protected readonly priorities = PRIORITIES;
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected label = (p: number) => LEVEL_LABEL[p];
  protected pretty = (m: number | null) => (m && m > 0 ? `= ${formatMinutes(m)}` : '');

  protected readonly form = this.fb.group(
    {
      name: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)]],
      priority: [Priority.Medium as Priority],
      responseTimeMinutes: [60, [Validators.required, Validators.min(1)]],
      resolutionTimeMinutes: [480, [Validators.required, Validators.min(1)]],
    },
    { validators: resolutionAfterResponse },
  );

  ngOnInit(): void {
    const p = this.policy();
    if (p) this.form.patchValue(p);
  }

  protected bad(n: 'name' | 'responseTimeMinutes' | 'resolutionTimeMinutes'): boolean {
    const c = this.form.controls[n];
    return c.invalid && (c.touched || c.dirty);
  }

  protected submit(): void {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body = { ...v, name: v.name.trim(), responseTimeMinutes: Number(v.responseTimeMinutes), resolutionTimeMinutes: Number(v.resolutionTimeMinutes) };
    const current = this.policy();
    this.busy.set(true);
    (current ? this.api.update(current.id, body) : this.api.create(body)).subscribe({
      next: (res) => {
        this.toast.success(current ? 'SLA policy updated.' : 'SLA policy created.');
        this.saved.emit(res);
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }
}

@Component({
  selector: 'app-sla-policies',
  imports: [IconComponent, LevelBadgeComponent, EmptyStateComponent, DurationPipe, DateTimePipe, SlaFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
    }

    .sla-page {
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
    .sla-workspace {
      display: flex;
      flex-direction: column;
      margin-top: 18px;
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
    .table tbody tr.clickable {
      cursor: pointer;
      transition: background-color 0.12s ease;
    }
    .table tbody tr.clickable:hover td {
      background: color-mix(in srgb, var(--brand) 4%, transparent);
    }

    /* Column Sizing */
    .th-policy, .td-policy {
      min-width: 260px;
    }
    .th-prio, .td-prio {
      width: 160px;
    }
    .th-resp, .td-resp {
      width: 170px;
    }
    .th-resol, .td-resol {
      width: 170px;
    }
    .th-updated, .td-updated {
      width: 160px;
    }
    .th-actions, .col-actions {
      width: 90px;
      text-align: right;
    }

    /* Policy Cell */
    .policy-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .sla-icon-mark {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: color-mix(in srgb, var(--brand) 12%, var(--surface));
      border: 1px solid color-mix(in srgb, var(--brand) 22%, transparent);
      color: var(--brand);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .policy-name {
      font-weight: 650;
      font-size: 14px;
      color: var(--text);
    }

    /* Target Pills */
    .sla-time-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 12.5px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .response-pill {
      background: var(--info-soft);
      color: var(--info);
    }
    .resolution-pill {
      background: var(--ok-soft);
      color: var(--ok);
    }

    .date-txt {
      color: var(--text-2);
      font-size: 12.5px;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .empty-wrap {
      padding: 36px 0;
    }

    @media (max-width: 768px) {
      .sla-page {
        padding: 16px 16px 40px;
      }
    }
  `,
  template: `
    <div class="sla-page">
      <div class="page-head">
        <div>
          <div class="title-cluster">
            <h1>SLA policies</h1>
            <span class="total-tag">{{ policies().length }} {{ policies().length === 1 ? 'policy' : 'policies' }}</span>
          </div>
          <p class="subtitle">Target thresholds for first response and complete resolution by incident priority.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-primary" (click)="editing.set({ policy: null })">
            <app-icon name="plus" /> New policy
          </button>
        </div>
      </div>

      <div class="sla-workspace">
        @if (error()) {
          <div class="alert alert-error" role="alert" style="margin-top: 16px;">{{ error() }}</div>
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th class="th-policy">Policy Name</th>
                  <th class="th-prio">Target Priority</th>
                  <th class="th-resp">First Response</th>
                  <th class="th-resol">Resolution Target</th>
                  <th class="th-updated">Last Modified</th>
                  <th class="th-actions"><span class="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                @if (loading()) {
                  @for (n of [1,2,3,4]; track n) {
                    <tr>
                      <td colspan="6"><span class="skeleton" style="height:26px; border-radius: 4px;"></span></td>
                    </tr>
                  }
                } @else {
                  @for (p of sorted(); track p.id) {
                    <tr class="clickable" (click)="editing.set({ policy: p })">
                      <td class="td-policy">
                        <div class="policy-cell">
                          <span class="sla-icon-mark"><app-icon name="sla" [size]="16" /></span>
                          <span class="policy-name">{{ p.name }}</span>
                        </div>
                      </td>
                      <td class="td-prio">
                        <app-level-badge [level]="p.priority" />
                      </td>
                      <td class="td-resp">
                        <span class="sla-time-pill response-pill">
                          <app-icon name="clock" [size]="12" />
                          <span>{{ p.responseTimeMinutes | dur }}</span>
                        </span>
                      </td>
                      <td class="td-resol">
                        <span class="sla-time-pill resolution-pill">
                          <app-icon name="check-circle" [size]="12" />
                          <span>{{ p.resolutionTimeMinutes | dur }}</span>
                        </span>
                      </td>
                      <td class="td-updated">
                        <span class="date-txt">{{ (p.updatedAt ?? p.createdAt) | dt: false }}</span>
                      </td>
                      <td class="col-actions">
                        <button
                          type="button"
                          class="btn btn-sm btn-quiet"
                          (click)="$event.stopPropagation(); editing.set({ policy: p })"
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

          @if (!loading() && policies().length === 0) {
            <div class="empty-wrap">
              <app-empty-state icon="sla" title="No SLA policies" message="Incidents cannot be created until their priority has a policy.">
                <button type="button" class="btn btn-primary" (click)="editing.set({ policy: null })">Create policy</button>
              </app-empty-state>
            </div>
          }
        }
      </div>
    </div>

    @if (editing(); as e) {
      <app-sla-form [policy]="e.policy" (closed)="editing.set(null)" (saved)="onSaved()" />
    }
  `,
})
export class SlaPoliciesComponent {
  private readonly api = inject(SlaApi);
  protected readonly policies = signal<SlaPolicy[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly editing = signal<{ policy: SlaPolicy | null } | null>(null);
  protected readonly sorted = computed(() => [...this.policies()].sort((a, b) => b.priority - a.priority));

  constructor() {
    this.load();
  }

  private load(): void {
    this.api.list().subscribe({
      next: (list) => {
        this.policies.set(list);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }

  protected onSaved(): void {
    this.editing.set(null);
    this.load();
  }
}
