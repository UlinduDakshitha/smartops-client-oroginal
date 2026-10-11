import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent, IconName } from './icon.component';

@Component({
  selector: 'app-empty-state',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; padding: 48px 24px; }
    .ico { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; background: var(--sunken); color: var(--text-3); margin-bottom: 6px; }
    h3 { font-size: 15px; }
    p { color: var(--text-2); max-width: 44ch; }
    .actions { margin-top: 10px; display: flex; gap: 8px; }
  `,
  template: `
    <span class="ico"><app-icon [name]="icon()" [size]="20" /></span>
    <h3>{{ title() }}</h3>
    @if (message()) { <p>{{ message() }}</p> }
    <div class="actions"><ng-content /></div>
  `,
})
export class EmptyStateComponent {
  readonly icon = input<IconName>('inbox');
  readonly title = input.required<string>();
  readonly message = input('');
}
