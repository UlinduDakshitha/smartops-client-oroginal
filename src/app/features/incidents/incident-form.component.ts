import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IncidentApi } from '../../core/api/incident.api';
import { Incident, PRIORITIES, Priority, SEVERITIES, Severity, LEVEL_LABEL } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';
import { toApiError } from '../../core/util/errors';
import { ModalComponent } from '../../shared/ui/modal.component';

@Component({
  selector: 'app-incident-form',
  imports: [ReactiveFormsModule, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [title]="incident() ? 'Edit incident' : 'New incident'" size="md" [busy]="busy()" (closed)="closed.emit()">
      <form id="incident-form" [formGroup]="form" (ngSubmit)="submit()" novalidate class="stack">
        @if (error()) { <div class="alert alert-error" role="alert">{{ error() }}</div> }

        <div class="field">
          <label for="if-title">Title</label>
          <input id="if-title" class="input" formControlName="title" maxlength="200" placeholder="What is broken?" [class.invalid]="bad('title')" />
          @if (bad('title')) { <span class="error">A title is required (up to 200 characters).</span> }
        </div>

        <div class="field">
          <label for="if-desc">Description</label>
          <textarea id="if-desc" class="textarea" rows="5" formControlName="description" maxlength="5000"
            placeholder="What happened, who is affected, and what have you tried?" [class.invalid]="bad('description')"></textarea>
          @if (bad('description')) { <span class="error">A description is required (up to 5000 characters).</span> }
        </div>

        <div class="form-grid">
          <div class="field">
            <label for="if-priority">Priority</label>
            <select id="if-priority" class="select" formControlName="priority">
              @for (p of priorities; track p) { <option [ngValue]="p">{{ label(p) }}</option> }
            </select>
            <span class="hint">
              {{ incident() ? 'Changing priority does not reset the SLA deadlines set at creation.' : 'Priority decides which SLA policy applies.' }}
            </span>
          </div>
          <div class="field">
            <label for="if-severity">Severity</label>
            <select id="if-severity" class="select" formControlName="severity">
              @for (s of severities; track s) { <option [ngValue]="s">{{ label(s) }}</option> }
            </select>
            <span class="hint">How badly the service is affected.</span>
          </div>
        </div>
      </form>

      <ng-container footer>
        <button type="button" class="btn" [disabled]="busy()" (click)="closed.emit()">Cancel</button>
        <button type="submit" form="incident-form" class="btn btn-primary" [disabled]="busy()">
          @if (busy()) { <span class="spinner"></span> }
          {{ incident() ? 'Save changes' : 'Create incident' }}
        </button>
      </ng-container>
    </app-modal>
  `,
})
export class IncidentFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly api = inject(IncidentApi);
  private readonly toast = inject(ToastService);

  readonly incident = input<Incident | null>(null);
  readonly saved = output<Incident>();
  readonly closed = output<void>();

  protected readonly priorities = PRIORITIES;
  protected readonly severities = SEVERITIES;
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected label = (n: number) => LEVEL_LABEL[n];

  protected readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200), Validators.pattern(/\S/)]],
    description: ['', [Validators.required, Validators.maxLength(5000), Validators.pattern(/\S/)]],
    priority: [Priority.Medium as Priority],
    severity: [Severity.Medium as Severity],
  });

  ngOnInit(): void {
    const i = this.incident();
    if (i) this.form.patchValue({ title: i.title, description: i.description, priority: i.priority, severity: i.severity });
  }

  protected bad(name: 'title' | 'description'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  protected submit(): void {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const input = { title: v.title.trim(), description: v.description.trim(), priority: v.priority, severity: v.severity };
    const current = this.incident();
    this.busy.set(true);
    const call = current ? this.api.update(current.id, input) : this.api.create(input);
    call.subscribe({
      next: (res) => {
        this.toast.success(current ? 'Incident updated.' : `${res.incidentNumber} created.`);
        this.saved.emit(res);
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }
}
