import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { toApiError } from '../../core/util/errors';
import { IconComponent } from '../../shared/ui/icon.component';
import { AuthLayoutComponent } from './auth-layout.component';

function matchPasswords(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value;
  const confirm = group.get('confirm')?.value;
  return pw && confirm && pw !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    h1 { margin-bottom: 6px; }
    .sub { color: var(--text-2); margin-bottom: 26px; }
    form { display: flex; flex-direction: column; gap: 16px; }
    .foot { margin-top: 22px; color: var(--text-2); text-align: center; }
  `,
  template: `
    <app-auth-layout>
      <h1>Create your account</h1>
      <p class="sub">New accounts start as Support Agents. An administrator can change your role later.</p>

      @if (error()) {
        <div class="alert alert-error" style="margin-bottom:16px" role="alert">
          <app-icon name="alert-circle" [size]="18" /> {{ error() }}
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="field">
          <label for="fullName">Full name</label>
          <input id="fullName" class="input" formControlName="fullName" autocomplete="name" autofocus [class.invalid]="invalid('fullName')" />
          @if (invalid('fullName')) { <span class="error">Enter your name (up to 100 characters).</span> }
        </div>
        <div class="field">
          <label for="email">Work email</label>
          <input id="email" class="input" type="email" formControlName="email" autocomplete="email" [class.invalid]="invalid('email')" />
          @if (invalid('email')) { <span class="error">Enter a valid email address.</span> }
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input id="password" class="input" type="password" formControlName="password" autocomplete="new-password" [class.invalid]="invalid('password')" />
          <span class="hint">At least 8 characters.</span>
          @if (invalid('password')) { <span class="error">Password must be at least 8 characters.</span> }
        </div>
        <div class="field">
          <label for="confirm">Confirm password</label>
          <input id="confirm" class="input" type="password" formControlName="confirm" autocomplete="new-password"
            [class.invalid]="invalid('confirm') || (form.hasError('mismatch') && form.controls.confirm.touched)" />
          @if (form.hasError('mismatch') && form.controls.confirm.touched) { <span class="error">Passwords do not match.</span> }
        </div>
        <button type="submit" class="btn btn-primary btn-block" [disabled]="busy()">
          @if (busy()) { <span class="spinner"></span> Creating account } @else { Create account }
        </button>
      </form>

      <p class="foot">Already have an account? <a routerLink="/login">Sign in</a></p>
    </app-auth-layout>
  `,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected readonly form = this.fb.group(
    {
      fullName: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', Validators.required],
    },
    { validators: matchPasswords },
  );

  protected invalid(name: 'fullName' | 'email' | 'password' | 'confirm'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  protected submit(): void {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { fullName, email, password } = this.form.getRawValue();
    this.busy.set(true);
    this.auth
      .register({ fullName: fullName.trim(), email: email.trim(), password })
      .pipe(switchMap(() => this.auth.login({ email: email.trim(), password }, true)))
      .subscribe({
        next: () => {
          this.toast.success('Your account is ready.', 'Welcome to SmartOps');
          void this.router.navigateByUrl(this.auth.homeRoute());
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(toApiError(e).message);
        },
      });
  }
}
