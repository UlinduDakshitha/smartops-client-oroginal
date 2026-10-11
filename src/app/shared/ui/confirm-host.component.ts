import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfirmService } from '../../core/services/confirm.service';
import { ModalComponent } from './modal.component';

@Component({
  selector: 'app-confirm-host',
  imports: [ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (confirm.state(); as s) {
      <app-modal [title]="s.title" size="sm" (closed)="confirm.answer(false)">
        <p class="muted">{{ s.message }}</p>
        <ng-container footer>
          <button type="button" class="btn" (click)="confirm.answer(false)">{{ s.cancelText ?? 'Cancel' }}</button>
          <button type="button" class="btn" [class.btn-danger]="s.danger" [class.btn-primary]="!s.danger" autofocus (click)="confirm.answer(true)">
            {{ s.confirmText ?? 'Confirm' }}
          </button>
        </ng-container>
      </app-modal>
    }
  `,
})
export class ConfirmHostComponent {
  protected readonly confirm = inject(ConfirmService);
}
