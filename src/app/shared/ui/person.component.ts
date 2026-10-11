import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DirectoryService } from '../../core/services/directory.service';

/** Avatar + name for a user id, resolved through the directory. */
@Component({
  selector: 'app-person',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
    .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .none { color: var(--text-3); }
  `,
  template: `
    @if (id()) {
      <span class="avatar avatar-sm" aria-hidden="true">{{ initials() }}</span>
      <span class="name">{{ name() }}</span>
    } @else {
      <span class="none">{{ emptyLabel() }}</span>
    }
  `,
})
export class PersonComponent {
  private readonly dir = inject(DirectoryService);
  readonly id = input<string | null | undefined>(null);
  readonly emptyLabel = input('Unassigned');
  readonly you = input(false);

  protected readonly name = computed(() => (this.you() ? this.dir.actorName(this.id()) : this.dir.userName(this.id())));
  protected readonly initials = computed(() => {
    const u = this.dir.user(this.id());
    const src = u?.fullName ?? '';
    if (!src) return '?';
    const parts = src.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  });
}
