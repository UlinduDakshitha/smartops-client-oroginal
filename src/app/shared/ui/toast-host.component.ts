import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-toast-host',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { position: fixed; z-index: 200; right: 20px; bottom: 20px; display: flex; flex-direction: column; gap: 10px; width: min(380px, calc(100vw - 40px)); pointer-events: none; }
    .toast { pointer-events: auto; display: flex; gap: 11px; align-items: flex-start; padding: 12px 12px 12px 14px;
      background: var(--surface); border: 1px solid var(--line); border-left-width: 4px; border-radius: var(--r-md);
      box-shadow: var(--shadow-pop); animation: in 0.2s ease-out; }
    .success { border-left-color: var(--ok); } .success .ico { color: var(--ok); }
    .error { border-left-color: var(--danger); } .error .ico { color: var(--danger); }
    .info { border-left-color: var(--brand); } .info .ico { color: var(--brand); }
    .ico { margin-top: 1px; }
    .text { flex: 1; min-width: 0; }
    .title { font-weight: 620; }
    .msg { color: var(--text-2); font-size: 13.5px; overflow-wrap: anywhere; }
    .title + .msg { margin-top: 1px; }
    @keyframes in { from { opacity: 0; transform: translateX(12px); } }
  `,
  template: `
    @for (t of toasts.toasts(); track t.id) {
      <div class="toast" [class]="'toast ' + t.kind" [attr.role]="t.kind === 'error' ? 'alert' : 'status'">
        <span class="ico">
          <app-icon [name]="t.kind === 'success' ? 'check-circle' : t.kind === 'error' ? 'alert-circle' : 'info'" [size]="18" />
        </span>
        <div class="text">
          @if (t.title) { <div class="title">{{ t.title }}</div> }
          <div class="msg">{{ t.message }}</div>
        </div>
        <button type="button" class="btn btn-quiet btn-icon btn-sm" aria-label="Dismiss" (click)="toasts.dismiss(t.id)"><app-icon name="x" /></button>
      </div>
    }
  `,
})
export class ToastHostComponent {
  protected readonly toasts = inject(ToastService);
}
