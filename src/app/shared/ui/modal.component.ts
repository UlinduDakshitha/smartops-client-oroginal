import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { IconComponent } from './icon.component';

let nextId = 0;

@Component({
  selector: 'app-modal',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .scrim { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 20px;
      background: var(--scrim); animation: fade 0.14s ease-out; }
    .dialog { width: 100%; max-height: calc(100dvh - 40px); display: flex; flex-direction: column;
      background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-lg);
      box-shadow: var(--shadow-modal); animation: rise 0.18s ease-out; }
    .sm { max-width: 420px; } .md { max-width: 560px; } .lg { max-width: 760px; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--line); }
    h2 { font-size: 16px; }
    .body { padding: 20px; overflow-y: auto; }
    footer { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 20px; border-top: 1px solid var(--line); background: var(--surface-2);
      border-radius: 0 0 var(--r-lg) var(--r-lg); }
    footer:empty { display: none; }
    @keyframes fade { from { opacity: 0; } }
    @keyframes rise { from { opacity: 0; transform: translateY(8px) scale(0.985); } }
  `,
  template: `
    <div class="scrim" (mousedown)="onScrim()">
      <div
        #dialog
        class="dialog"
        [class]="'dialog ' + size()"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="titleId"
        (mousedown)="$event.stopPropagation()"
      >
        <header>
          <h2 [id]="titleId">{{ title() }}</h2>
          <button type="button" class="btn btn-quiet btn-icon btn-sm" aria-label="Close" [disabled]="busy()" (click)="closed.emit()">
            <app-icon name="x" />
          </button>
        </header>
        <div class="body"><ng-content /></div>
        <footer><ng-content select="[footer]" /></footer>
      </div>
    </div>
  `,
})
export class ModalComponent implements AfterViewInit, OnDestroy {
  private readonly doc = inject(DOCUMENT);
  private readonly dialog = viewChild.required<ElementRef<HTMLElement>>('dialog');
  private previouslyFocused: Element | null = null;

  readonly title = input.required<string>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  /** While busy (saving) the dialog cannot be dismissed. */
  readonly busy = input(false);
  readonly closed = output<void>();
  protected readonly titleId = `modal-title-${++nextId}`;

  ngAfterViewInit(): void {
    this.previouslyFocused = this.doc.activeElement;
    this.doc.body.style.overflow = 'hidden';
    const el = this.dialog().nativeElement;
    const target =
      el.querySelector<HTMLElement>('[autofocus], .body input:not([type=hidden]), .body select, .body textarea') ??
      el.querySelector<HTMLElement>('footer button, .body button');
    target?.focus();
  }

  ngOnDestroy(): void {
    this.doc.body.style.overflow = '';
    if (this.previouslyFocused instanceof HTMLElement) this.previouslyFocused.focus();
  }

  protected onScrim(): void {
    if (!this.busy()) this.closed.emit();
  }

  @HostListener('document:keydown', ['$event'])
  protected onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape' && !this.busy()) {
      e.stopPropagation();
      this.closed.emit();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusables = Array.from(
      this.dialog().nativeElement.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = this.doc.activeElement;
    if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  }
}
