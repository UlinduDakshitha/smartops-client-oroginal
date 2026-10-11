import { Routes } from '@angular/router';
import { ACCESS } from './core/models/models';
import { authGuard, guestGuard, homeRedirectGuard, roleGuard } from './core/guards/guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Sign in · SmartOps',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    title: 'Create account · SmartOps',
    loadComponent: () => import('./features/auth/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', canActivate: [homeRedirectGuard], children: [] },
      {
        path: 'dashboard',
        canActivate: [roleGuard],
        data: { roles: ACCESS.dashboard },
        title: 'Dashboard · SmartOps',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'incidents',
        canActivate: [roleGuard],
        data: { roles: ACCESS.incidents },
        children: [
          {
            path: '',
            title: 'Incidents · SmartOps',
            loadComponent: () =>
              import('./features/incidents/incident-list.component').then((m) => m.IncidentListComponent),
          },
          {
            path: ':id',
            title: 'Incident · SmartOps',
            loadComponent: () =>
              import('./features/incidents/incident-detail.component').then((m) => m.IncidentDetailComponent),
          },
        ],
      },
      {
        path: 'teams',
        canActivate: [roleGuard],
        data: { roles: ACCESS.teams },
        children: [
          {
            path: '',
            title: 'Teams · SmartOps',
            loadComponent: () => import('./features/teams/team-list.component').then((m) => m.TeamListComponent),
          },
          {
            path: ':id',
            title: 'Team · SmartOps',
            loadComponent: () => import('./features/teams/team-detail.component').then((m) => m.TeamDetailComponent),
          },
        ],
      },
      {
        path: 'users',
        canActivate: [roleGuard],
        data: { roles: ACCESS.adminOnly },
        title: 'Users · SmartOps',
        loadComponent: () => import('./features/users/user-list.component').then((m) => m.UserListComponent),
      },
      {
        path: 'sla',
        canActivate: [roleGuard],
        data: { roles: ACCESS.adminOnly },
        title: 'SLA policies · SmartOps',
        loadComponent: () => import('./features/sla/sla-policies.component').then((m) => m.SlaPoliciesComponent),
      },
      {
        path: 'audit',
        canActivate: [roleGuard],
        data: { roles: ACCESS.adminOnly },
        title: 'Audit log · SmartOps',
        loadComponent: () => import('./features/audit/audit-log.component').then((m) => m.AuditLogComponent),
      },
      {
        path: 'notifications',
        title: 'Notifications · SmartOps',
        loadComponent: () =>
          import('./features/notifications/notifications.component').then((m) => m.NotificationsComponent),
      },
      {
        path: 'forbidden',
        title: 'No access · SmartOps',
        loadComponent: () => import('./features/system/forbidden.component').then((m) => m.ForbiddenComponent),
      },
    ],
  },
  {
    path: '**',
    title: 'Not found · SmartOps',
    loadComponent: () => import('./features/system/not-found.component').then((m) => m.NotFoundComponent),
  },
];
