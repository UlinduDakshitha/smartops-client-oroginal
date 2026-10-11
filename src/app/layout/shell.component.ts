import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ACCESS } from '../core/models/models';
import { AuthService } from '../core/services/auth.service';
import { DirectoryService } from '../core/services/directory.service';
import { NotificationHubService } from '../core/services/notification-hub.service';
import { ThemeService } from '../core/services/theme.service';
import { IconComponent, IconName } from '../shared/ui/icon.component';
import { NotificationBellComponent } from './notification-bell.component';

interface NavItem { label: string; path: string; icon: IconName; roles: string[] | null }

const NAV: { title: string; items: NavItem[] }[] = [
  {
    title: 'Operations',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: 'dashboard', roles: ACCESS.dashboard },
      { label: 'Incidents', path: '/incidents', icon: 'incident', roles: ACCESS.incidents },
      { label: 'Teams', path: '/teams', icon: 'team', roles: ACCESS.teams },
      { label: 'Notifications', path: '/notifications', icon: 'bell', roles: null },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Users', path: '/users', icon: 'user', roles: ACCESS.adminOnly },
      { label: 'SLA policies', path: '/sla', icon: 'sla', roles: ACCESS.adminOnly },
      { label: 'Audit log', path: '/audit', icon: 'audit', roles: ACCESS.adminOnly },
    ],
  },
];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, NotificationBellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; min-height: 100dvh; }
    .sidebar { position: fixed; inset: 0 auto 0 0; width: var(--sidebar-w); display: flex; flex-direction: column;
      background: var(--side); color: var(--side-text); z-index: 40; transition: transform 0.2s ease; }
    .brand { display: flex; align-items: center; gap: 10px; height: var(--topbar-h); padding: 0 18px; color: var(--side-strong);
      font-weight: 720; font-size: 17px; letter-spacing: -0.02em; border-bottom: 1px solid var(--side-line); }
    .brand:hover { text-decoration: none; }
    .nav { flex: 1; overflow-y: auto; padding: 14px 10px; display: flex; flex-direction: column; gap: 18px; }
    .group-title { padding: 0 10px 6px; font-size: 12.5px; color: var(--side-text); opacity: 0.7; }
    .link { position: relative; display: flex; align-items: center; gap: 11px; height: 38px; padding: 0 10px; border-radius: var(--r-md);
      color: var(--side-text); font-weight: 540; }
    .link:hover { background: var(--side-line); color: var(--side-strong); text-decoration: none; }
    .link.active { background: var(--side-2); color: var(--side-strong); }
    .link.active::before { content: ''; position: absolute; left: -10px; top: 8px; bottom: 8px; width: 3px; border-radius: 0 3px 3px 0; background: var(--side-accent); }
    .side-foot { padding: 12px 18px; border-top: 1px solid var(--side-line); font-size: 12.5px; display: flex; align-items: center; gap: 8px; }
    .pulse { width: 8px; height: 8px; border-radius: 50%; background: #7d8f96; }
    .pulse.live { background: #4cc38f; box-shadow: 0 0 0 0 rgba(76, 195, 143, 0.6); animation: pulse 2.4s infinite; }
    .pulse.connecting, .pulse.reconnecting { background: #e7b04c; }
    @keyframes pulse { 70% { box-shadow: 0 0 0 7px rgba(76, 195, 143, 0); } 100% { box-shadow: 0 0 0 0 rgba(76, 195, 143, 0); } }

    .main { margin-left: var(--sidebar-w); min-height: 100dvh; display: flex; flex-direction: column; }
    .topbar { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; gap: 8px; height: var(--topbar-h); padding: 0 24px;
      background: color-mix(in srgb, var(--surface) 92%, transparent); backdrop-filter: blur(8px); border-bottom: 1px solid var(--line); }
    .menu-btn { display: none; }

    /* Profile Trigger */
    .user { position: relative; }
    .user-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 38px;
      padding: 0 10px 0 4px;
      border: 1px solid var(--line-2);
      border-radius: 999px;
      background: var(--surface);
      cursor: pointer;
      transition: all 0.12s ease;
    }
    .user-btn:hover {
      background: var(--sunken);
      border-color: var(--line);
    }
    .user-avatar-mark {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: color-mix(in srgb, var(--brand) 15%, var(--surface));
      color: var(--brand);
      font-weight: 700;
      font-size: 11.5px;
      display: flex;
      align-items: center;
      justify-content: center;
      letter-spacing: 0.02em;
      flex-shrink: 0;
    }
    .user-name-label {
      max-width: 140px;
      font-weight: 600;
      font-size: 13px;
      color: var(--text);
    }

    /* Profile Menu Popover */
    .menu {
      position: absolute;
      right: 0;
      top: calc(100% + 8px);
      width: 290px;
      z-index: 60;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--r-lg);
      box-shadow: var(--shadow-pop);
      overflow: hidden;
      padding: 6px;
    }
    .menu-profile-card {
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 12px;
      background: color-mix(in srgb, var(--brand) 4%, var(--surface));
      border: 1px solid color-mix(in srgb, var(--brand) 12%, transparent);
      border-radius: var(--r-md);
    }
    .profile-avatar-wrap {
      position: relative;
      flex-shrink: 0;
    }
    .profile-avatar-lg {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: color-mix(in srgb, var(--brand) 14%, var(--surface));
      border: 1.5px solid color-mix(in srgb, var(--brand) 28%, transparent);
      color: var(--brand);
      font-weight: 750;
      font-size: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      letter-spacing: 0.02em;
    }
    .status-indicator-badge {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 11px;
      height: 11px;
      border-radius: 50%;
      background: #22c55e;
      border: 2px solid var(--surface);
    }
    .profile-details {
      flex: 1;
      min-width: 0;
    }
    .profile-name {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text);
      line-height: 1.3;
    }
    .profile-email {
      font-size: 12px;
      color: var(--text-2);
      line-height: 1.3;
      margin-top: 2px;
    }
    .profile-roles-strip {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      margin-top: 6px;
    }
    .role-badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 1px 7px;
      border-radius: 999px;
      background: var(--brand-soft);
      color: var(--brand-ink);
      font-size: 11px;
      font-weight: 600;
    }

    .menu-section {
      padding: 8px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: var(--text-2);
    }
    .status-tag-online {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 550;
      color: var(--ok);
    }
    .status-glow-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--ok);
    }
    .session-type {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-3);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .menu-divider {
      height: 1px;
      background: var(--line);
      margin: 4px 6px;
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 10px 12px;
      border: 0;
      border-radius: var(--r-md);
      background: none;
      font-size: 13.5px;
      font-weight: 550;
      color: var(--text);
      cursor: pointer;
      text-align: left;
      transition: background 0.12s ease;
    }
    .menu-item:hover {
      background: var(--surface-2);
    }
    .logout-item {
      color: var(--danger);
    }
    .logout-item:hover {
      background: color-mix(in srgb, var(--danger) 8%, transparent);
      color: var(--danger);
    }

    .scrim { display: none; }
    .content { flex: 1; }

    @media (max-width: 960px) {
      .sidebar { transform: translateX(-100%); }
      .open .sidebar { transform: none; box-shadow: var(--shadow-modal); }
      .main { margin-left: 0; }
      .menu-btn { display: inline-flex; }
      .topbar { padding: 0 12px; }
      .user-name-label { display: none; }
      .scrim { display: block; position: fixed; inset: 0; background: var(--scrim); z-index: 35; }
    }
  `,
  template: `
    <div [class.open]="navOpen()">
      <aside class="sidebar" aria-label="Primary">
        <a class="brand" routerLink="/">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#0a6b7c" />
            <rect x="7" y="9" width="18" height="3" rx="1.5" fill="#fff" opacity=".35" />
            <rect x="7" y="9" width="12" height="3" rx="1.5" fill="#fff" />
            <rect x="7" y="15" width="18" height="3" rx="1.5" fill="#fff" opacity=".35" />
            <rect x="7" y="15" width="16" height="3" rx="1.5" fill="#f5b74a" />
            <rect x="7" y="21" width="18" height="3" rx="1.5" fill="#fff" opacity=".35" />
            <rect x="7" y="21" width="6" height="3" rx="1.5" fill="#5fd0dc" />
          </svg>
          SmartOps
        </a>
        <nav class="nav">
          @for (group of groups(); track group.title) {
            <div>
              <div class="group-title">{{ group.title }}</div>
              @for (item of group.items; track item.path) {
                <a class="link" [routerLink]="item.path" routerLinkActive="active" (click)="navOpen.set(false)">
                  <app-icon [name]="item.icon" [size]="18" />
                  {{ item.label }}
                </a>
              }
            </div>
          }
        </nav>
        <div class="side-foot" [title]="hubTitle()">
          <span [class]="'pulse ' + hub.status()"></span>
          {{ hubLabel() }}
        </div>
      </aside>

      @if (navOpen()) { <div class="scrim" (click)="navOpen.set(false)"></div> }

      <div class="main">
        <header class="topbar">
          <button type="button" class="btn btn-quiet btn-icon menu-btn" aria-label="Open navigation" (click)="navOpen.set(true)">
            <app-icon name="menu" [size]="20" />
          </button>
          <span class="spacer"></span>
          <button type="button" class="btn btn-quiet btn-icon" [attr.aria-label]="theme.theme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'" (click)="theme.toggle()">
            <app-icon [name]="theme.theme() === 'dark' ? 'sun' : 'moon'" [size]="18" />
          </button>
          <app-notification-bell />
          <div class="user">
            <button
              type="button"
              class="user-btn"
              aria-haspopup="true"
              [attr.aria-expanded]="menuOpen()"
              (click)="menuOpen.update(v => !v)"
            >
              <span class="user-avatar-mark">{{ initials() }}</span>
              <span class="user-name-label truncate">{{ displayName() }}</span>
              <app-icon name="chevron-down" [size]="13" />
            </button>
            @if (menuOpen()) {
              <div class="menu" role="menu">
                <div class="menu-profile-card">
                  <div class="profile-avatar-wrap">
                    <div class="profile-avatar-lg">
                      {{ initials() }}
                    </div>
                    <span class="status-indicator-badge" title="Active session"></span>
                  </div>
                  <div class="profile-details">
                    <div class="profile-name truncate">{{ displayName() }}</div>
                    <div class="profile-email truncate">{{ email() }}</div>
                    <div class="profile-roles-strip">
                      @for (r of auth.roles(); track r) {
                        <span class="role-badge-pill">
                          <app-icon [name]="r === 'Administrator' ? 'shield' : 'user'" [size]="11" />
                          {{ r }}
                        </span>
                      }
                    </div>
                  </div>
                </div>

                <div class="menu-section">
                  <span class="status-tag-online">
                    <span class="status-glow-dot"></span> Active Session
                  </span>
                  <span class="session-type">{{ auth.isAdmin() ? 'Administrator' : 'User' }}</span>
                </div>

                <div class="menu-divider"></div>

                <button type="button" class="menu-item logout-item" role="menuitem" (click)="signOut()">
                  <app-icon name="logout" [size]="15" />
                  <span>Sign out</span>
                </button>
              </div>
            }
          </div>
        </header>
        <div class="content"><router-outlet /></div>
      </div>
    </div>
  `,
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly dir = inject(DirectoryService);
  protected readonly theme = inject(ThemeService);
  protected readonly hub = inject(NotificationHubService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly navOpen = signal(false);
  protected readonly menuOpen = signal(false);

  protected readonly email = computed(() => this.auth.user()?.email ?? '');
  protected readonly displayName = computed(() => {
    const id = this.auth.user()?.id;
    const name = id ? this.dir.userName(id) : '';
    if (name && !name.startsWith('User ')) return name;
    const email = this.email();
    const local = email.split('@')[0] ?? '';
    return (
      local
        .split(/[._-]+/)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ') || 'User'
    );
  });
  protected readonly initials = computed(() => {
    const name = this.displayName();
    const letters = (name.match(/\b\w/g) ?? []).slice(0, 2).join('');
    return (letters || this.email().slice(0, 2) || '?').toUpperCase();
  });

  protected readonly groups = computed(() =>
    NAV.map((g) => ({
      title: g.title,
      items: g.items.filter((i) => i.roles === null || this.auth.hasAnyRole(i.roles)),
    })).filter((g) => g.items.length > 0),
  );

  protected readonly hubLabel = computed(() => {
    switch (this.hub.status()) {
      case 'live': return 'Live updates on';
      case 'connecting': return 'Connecting…';
      case 'reconnecting': return 'Reconnecting…';
      default: return 'Live updates off';
    }
  });
  protected readonly hubTitle = computed(() =>
    this.hub.status() === 'offline' ? 'Real-time notifications are not connected. The list still refreshes when you reload.' : 'Real-time notifications connection',
  );

  constructor() {
    this.dir.load();
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.navOpen.set(false);
      this.menuOpen.set(false);
    });
  }

  protected signOut(): void {
    this.menuOpen.set(false);
    this.auth.logout();
  }

  @HostListener('document:mousedown', ['$event'])
  protected onOutside(e: MouseEvent): void {
    const userEl = this.host.nativeElement.querySelector('.user');
    if (this.menuOpen() && userEl && !userEl.contains(e.target as Node)) this.menuOpen.set(false);
  }
}
