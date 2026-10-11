import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="min-height:100dvh;display:grid;place-items:center">
      <app-empty-state icon="search" title="This page does not exist" message="The address may be wrong, or the page has moved.">
        <a class="btn btn-primary" routerLink="/">Go to SmartOps</a>
      </app-empty-state>
    </div>
  `,
})
export class NotFoundComponent {}
