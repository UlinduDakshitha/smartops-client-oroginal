# SmartOps Web

Angular 21 frontend (standalone components, signals, zoneless) for the SmartOps incident-management API.

## Run it

```bash
# 1. API (from the SmartOps solution)
cd SmartOps.API && dotnet run --launch-profile http     # http://localhost:5181

# 2. Frontend
cd smartops-web
npm install
npm start                                               # http://localhost:4200
```

The API's CORS policy only allows `http(s)://localhost:4200`, so keep that port.
Sign in with the seeded admin (`InitialAdmin__Email` / `InitialAdmin__Password` in `launchSettings.json`).

API addresses live in `src/environments/environment.ts` (dev) and `environment.prod.ts` (`ng build`).

## What is in it

| Area | Route | Who can open it (mirrors API policies) |
|---|---|---|
| Dashboard | `/dashboard` | Administrator, Manager |
| Incidents (list, detail, create/edit, assign, start, resolve, close, cancel, comments, activity) | `/incidents` | Administrator, Team Lead, Support Agent, Engineer |
| Teams (members, team lead) | `/teams` | Administrator, Team Lead |
| Users (create, edit, activate/deactivate, add roles) | `/users` | Administrator |
| SLA policies | `/sla` | Administrator |
| Audit log | `/audit` | Administrator |
| Notifications (+ live SignalR toasts) | `/notifications` | everyone |

Menu items, routes and buttons are hidden/blocked by role, and the landing page depends on role.

## Structure

```
src/app
  core/        models, API services (one per controller), auth, interceptor, guards, SignalR, stores
  shared/      ui (icons, badges, SLA rail, modal, pagination...), charts (pure SVG), pipes
  layout/      shell (sidebar, topbar, notification bell)
  features/    auth, dashboard, incidents, teams, users, sla, audit, notifications, system
```

* JWT access token is attached by `auth.interceptor.ts`; a 401 triggers one refresh-token rotation and replays the request.
* "Keep me signed in" stores the session in localStorage, otherwise sessionStorage.
* Enums are integers on the wire (the API has no string-enum converter); `core/models/models.ts` mirrors them.

## Backend notes found while wiring this up

1. **SignalR auth** – browsers send the token as `?access_token=` for WebSockets, but `Program.cs` does not read it,
   so live notifications fall back to slow transports or fail. Add to `AddJwtBearer(...)`:

   ```csharp
   options.Events = new JwtBearerEvents
   {
       OnMessageReceived = ctx =>
       {
           var token = ctx.Request.Query["access_token"];
           if (!string.IsNullOrEmpty(token) && ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
               ctx.Token = token;
           return Task.CompletedTask;
       }
   };
   ```
2. **Comments** – only `POST /api/incident/{id}/comments` exists. After you add a GET returning
   `IncidentCommentResponse[]`, set `features.incidentCommentsList: true` in the environment files.
3. **Assign order** – `IncidentService.AssignAsync` checks "user belongs to team" *after* saving. The UI only offers team members, so it never hits this, but the check should move above the update.
4. **Validators** – FluentValidation validators are registered but never run automatically (no auto-validation package wired). The UI enforces the same rules client-side.
5. `IncidentHistory` has no timestamp, so the activity list shows order only.
