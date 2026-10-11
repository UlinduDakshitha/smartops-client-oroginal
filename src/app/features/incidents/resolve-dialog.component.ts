import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IncidentApi } from '../../core/api/incident.api';
import { Incident } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';
import { toApiError } from '../../core/util/errors';
import { ModalComponent } from '../../shared/ui/modal.component';

@Component({
  selector: 'app-resolve-dialog',
  imports: [ReactiveFormsModule, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal title="Resolve incident" size="md" [busy]="busy()" (closed)="closed.emit()">
      <form id="resolve-form" [formGroup]="form" (ngSubmit)="submit()" novalidate class="stack">
        <p class="muted">Record what fixed {{ incident().incidentNumber }} so the next person does not start from zero.</p>
        @if (error()) { <div class="alert alert-error" role="alert">{{ error() }}</div> }
        <div class="field">
          <label for="rs-notes">Resolution notes</label>
          <textarea id="rs-notes" class="textarea" rows="4" formControlName="resolutionNotes" maxlength="5000" [class.invalid]="bad('resolutionNotes')"></textarea>
          @if (bad('resolutionNotes')) { <span class="error">Describe how the incident was resolved.</span> }
        </div>
        <div class="field">
          <label for="rs-root">Root cause</label>
          <textarea id="rs-root" class="textarea" rows="3" formControlName="rootCause" maxlength="2000" [class.invalid]="bad('rootCause')"></textarea>
          @if (bad('rootCause')) { <span class="error">State the root cause.</span> }
        </div>
      </form>
      <ng-container footer>
        <button type="button" class="btn" [disabled]="busy()" (click)="closed.emit()">Cancel</button>
        <button type="submit" form="resolve-form" class="btn btn-primary" [disabled]="busy()">
          @if (busy()) { <span class="spinner"></span> } Mark as resolved
        </button>
      </ng-container>
    </app-modal>
  `,
})
export class ResolveDialogComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly api = inject(IncidentApi);
  private readonly toast = inject(ToastService);

  readonly incident = input.required<Incident>();
  readonly resolved = output<void>();
  readonly closed = output<void>();

  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly form = this.fb.group({
    resolutionNotes: ['', [Validators.required, Validators.maxLength(5000), Validators.pattern(/\S/)]],
    rootCause: ['', [Validators.required, Validators.maxLength(2000), Validators.pattern(/\S/)]],
  });

  protected bad(name: 'resolutionNotes' | 'rootCause'): boolean {
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
    this.busy.set(true);
    this.api.resolve(this.incident().id, { resolutionNotes: v.resolutionNotes.trim(), rootCause: v.rootCause.trim() }).subscribe({
      next: () => {
        this.toast.success('Incident resolved.');
        this.resolved.emit();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }
}
