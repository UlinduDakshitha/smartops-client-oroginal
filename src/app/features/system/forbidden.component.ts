import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';

@Component({
  selector: 'app-forbidden',
  imports: [RouterLink, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-empty-state icon="lock" title="Your role cannot open this page"
        message="Ask an administrator if you need access. Your current roles: {{ auth.roles().join(', ') || 'none' }}.">
        <a class="btn btn-primary" [routerLink]="auth.homeRoute()">Back to my home</a>
      </app-empty-state>
    </div>
  `,
})
export class ForbiddenComponent {
  protected readonly auth = inject(AuthService);
}
