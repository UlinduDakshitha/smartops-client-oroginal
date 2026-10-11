import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { toApiError } from '../../core/util/errors';
import { IconComponent } from '../../shared/ui/icon.component';
import { AuthLayoutComponent } from './auth-layout.component';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    h1 { margin-bottom: 6px; }
    .sub { color: var(--text-2); margin-bottom: 26px; }
    form { display: flex; flex-direction: column; gap: 16px; }
    .pw { position: relative; }
    .pw .input { padding-right: 42px; }
    .pw button { position: absolute; right: 3px; top: 3px; }
    .foot { margin-top: 22px; color: var(--text-2); text-align: center; }
  `,
  template: `
    <app-auth-layout>
      <h1>Sign in</h1>
      <p class="sub">Use your SmartOps work account.</p>

      @if (expired()) {
        <div class="alert alert-warn" style="margin-bottom:16px" role="status">
          <app-icon name="clock" [size]="18" /> Your session expired. Sign in again to continue.
        </div>
      }
      @if (error()) {
        <div class="alert alert-error" style="margin-bottom:16px" role="alert">
          <app-icon name="alert-circle" [size]="18" /> {{ error() }}
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" class="input" type="email" formControlName="email" autocomplete="username" autofocus
            [class.invalid]="invalid('email')" placeholder="you@company.com" />
          @if (invalid('email')) { <span class="error">Enter a valid email address.</span> }
        </div>
        <div class="field">
          <label for="password">Password</label>
          <div class="pw">
            <input id="password" class="input" [type]="show() ? 'text' : 'password'" formControlName="password"
              autocomplete="current-password" [class.invalid]="invalid('password')" />
            <button type="button" class="btn btn-quiet btn-icon btn-sm" [attr.aria-label]="show() ? 'Hide password' : 'Show password'" (click)="show.set(!show())">
              <app-icon [name]="show() ? 'eye-off' : 'eye'" />
            </button>
          </div>
          @if (invalid('password')) { <span class="error">Enter your password.</span> }
        </div>
        <label class="check"><input type="checkbox" formControlName="remember" /> Keep me signed in on this device</label>
        <button type="submit" class="btn btn-primary btn-block" [disabled]="busy()">
          @if (busy()) { <span class="spinner"></span> Signing in } @else { Sign in }
        </button>
      </form>

      <p class="foot">New to SmartOps? <a routerLink="/register">Create an account</a></p>
    </app-auth-layout>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** bound from ?returnUrl= and ?expired= (withComponentInputBinding) */
  readonly returnUrl = input<string | undefined>();
  readonly expired = input<string | undefined>();

  protected readonly busy = signal(false);
  protected readonly show = signal(false);
  protected readonly error = signal('');

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    remember: [true],
  });

  protected invalid(name: 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  protected submit(): void {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password, remember } = this.form.getRawValue();
    this.busy.set(true);
    this.auth.login({ email: email.trim(), password }, remember).subscribe({
      next: () => {
        const target = this.returnUrl();
        // Only follow in-app return URLs.
        void this.router.navigateByUrl(target && target.startsWith('/') && !target.startsWith('//') ? target : this.auth.homeRoute());
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }
}
