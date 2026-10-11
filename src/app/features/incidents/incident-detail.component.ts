import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable, forkJoin, of, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IncidentApi } from '../../core/api/incident.api';
import {
  ACCESS,
  Incident,
  IncidentComment,
  IncidentHistoryEntry,
  IncidentStatus,
  STATUS_LABEL,
} from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { DirectoryService } from '../../core/services/directory.service';
import { ToastService } from '../../core/services/toast.service';
import { toApiError } from '../../core/util/errors';
import { DateTimePipe, RelativeTimePipe } from '../../shared/pipes/format.pipes';
import { LevelBadgeComponent, StatusBadgeComponent } from '../../shared/ui/badges.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { PersonComponent } from '../../shared/ui/person.component';
import { SlaRailComponent } from '../../shared/ui/sla-rail.component';
import { AssignDialogComponent } from './assign-dialog.component';
import { IncidentFormComponent } from './incident-form.component';
import { ResolveDialogComponent } from './resolve-dialog.component';
import { can } from './incident-utils';

const FLOW = [
  IncidentStatus.New,
  IncidentStatus.Assigned,
  IncidentStatus.InProgress,
  IncidentStatus.Resolved,
  IncidentStatus.Closed,
];

type Tab = 'activity' | 'comments';

@Component({
  selector: 'app-incident-detail',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IconComponent,
    StatusBadgeComponent,
    LevelBadgeComponent,
    SlaRailComponent,
    PersonComponent,
    EmptyStateComponent,
    IncidentFormComponent,
    AssignDialogComponent,
    ResolveDialogComponent,
    DateTimePipe,
    RelativeTimePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .back { display: inline-flex; align-items: center; gap: 6px; color: var(--text-2); margin-bottom: 14px; font-weight: 540; }
    .back:hover { color: var(--text); text-decoration: none; }
    .head { display: flex; gap: 24px; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; }
    .head-main { min-width: 0; flex: 1 1 420px; }
    .number { color: var(--text-3); font-size: 13px; font-variant-numeric: tabular-nums; margin-bottom: 4px; }
    h1 { overflow-wrap: anywhere; }
    .badges { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; align-items: center; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }

    .flow { display: flex; align-items: center; margin: 24px 0 22px; padding: 14px 18px; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; overflow-x: auto; }
    .step { display: flex; align-items: center; gap: 9px; color: var(--text-3); font-weight: 560; white-space: nowrap; }
    .step .n { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--line-2); font-size: 12px; font-weight: 700; flex: none; }
    .step.done { color: var(--text-2); } .step.done .n { background: var(--brand); border-color: var(--brand); color: var(--on-brand); }
    .step.current { color: var(--text); } .step.current .n { border-color: var(--brand); color: var(--brand); box-shadow: 0 0 0 4px var(--brand-soft); }
    .bar { flex: 1 0 24px; height: 2px; margin: 0 12px; background: var(--line-2); min-width: 24px; }
    .bar.done { background: var(--brand); }

    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 20px; align-items: start; }
    @media (max-width: 1050px) { .layout { grid-template-columns: 1fr; } }
    .desc { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.6; max-width: 80ch; }
    .resolution h3 { margin-bottom: 4px; }
    .resolution p { white-space: pre-wrap; overflow-wrap: anywhere; }

    .timeline { position: relative; display: flex; flex-direction: column; gap: 0; padding-left: 4px; }
    .tl { position: relative; display: grid; grid-template-columns: 22px 1fr; gap: 12px; padding-bottom: 18px; }
    .tl:last-child { padding-bottom: 0; }
    .tl::before { content: ''; position: absolute; left: 6px; top: 16px; bottom: -2px; width: 2px; background: var(--line); }
    .tl:last-child::before { display: none; }
    .dot { width: 14px; height: 14px; margin: 3px 0 0 0; border-radius: 50%; background: var(--surface); border: 3px solid var(--brand); z-index: 1; }
    .tl-title { font-weight: 600; }
    .tl-meta { color: var(--text-2); font-size: 13px; }
    .tl-change { margin-top: 6px; padding: 8px 10px; background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--r-md); font-size: 13px; overflow-wrap: anywhere; }
    .tl-change .arrow { color: var(--text-3); padding: 0 6px; }

    .comment { display: grid; grid-template-columns: 30px 1fr; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--line); }
    .comment:last-child { border-bottom: 0; }
    .comment p { white-space: pre-wrap; overflow-wrap: anywhere; margin-top: 2px; }
    .side-block { padding: 16px 18px; }
    .side-block + .side-block { border-top: 1px solid var(--line); }
    .side-block h3 { margin-bottom: 14px; }
    .due { display: flex; justify-content: space-between; gap: 12px; font-size: 12.5px; color: var(--text-3); margin-top: 6px; }
    .rails { display: flex; flex-direction: column; gap: 18px; }
  `,
  template: `
    <div class="page">
      <a class="back" routerLink="/incidents"><app-icon name="arrow-left" /> All incidents</a>

      @if (loading() && !incident()) {
        <div class="stack-lg">
          <span class="skeleton" style="height:34px;width:50%"></span>
          <span class="skeleton" style="height:64px"></span>
          <span class="skeleton" style="height:260px"></span>
        </div>
      } @else if (error() && !incident()) {
        <app-empty-state icon="alert-circle" title="Could not load this incident" [message]="error()">
          <button type="button" class="btn" (click)="reload()">Try again</button>
          <a class="btn btn-primary" routerLink="/incidents">Back to incidents</a>
        </app-empty-state>
      } @else if (incident(); as i) {
        <div class="head">
          <div class="head-main">
            <div class="number">{{ i.incidentNumber }}</div>
            <h1>{{ i.title }}</h1>
            <div class="badges">
              <app-status-badge [status]="i.status" />
              <span class="row" style="gap:6px"><span class="small muted">Priority</span><app-level-badge [level]="i.priority" /></span>
              <span class="row" style="gap:6px"><span class="small muted">Severity</span><app-level-badge [level]="i.severity" /></span>
            </div>
          </div>
          <div class="actions">
            @if (can.edit(i)) {
              <button type="button" class="btn" [disabled]="busy()" (click)="editing.set(true)"><app-icon name="edit" /> Edit</button>
            }
            @if (can.cancel(i)) {
              <button type="button" class="btn btn-danger-quiet" [disabled]="busy()" (click)="cancel(i)">Cancel incident</button>
            }
            @if (can.assign(i) && canAssign) {
              <button type="button" class="btn" [class.btn-primary]="i.status === Status.New" [disabled]="busy()" (click)="assigning.set(true)">
                <app-icon name="user-plus" /> {{ i.assignedTeamId ? 'Reassign' : 'Assign' }}
              </button>
            }
            @if (can.start(i)) {
              <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="start(i)"><app-icon name="play" /> Start work</button>
            }
            @if (can.resolve(i)) {
              <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="resolving.set(true)"><app-icon name="check" /> Resolve</button>
            }
            @if (can.close(i)) {
              <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="close(i)"><app-icon name="lock" /> Close incident</button>
            }
          </div>
        </div>

        @if (i.status === Status.Cancelled) {
          <div class="alert alert-warn" style="margin:22px 0"><app-icon name="info" [size]="18" /> This incident was cancelled. It can no longer be edited or assigned.</div>
        } @else {
          <ol class="flow" aria-label="Incident progress">
            @for (s of flow; track s; let idx = $index) {
              <li class="step" [class.done]="idx < flowIndex()" [class.current]="idx === flowIndex()" [attr.aria-current]="idx === flowIndex() ? 'step' : null">
                <span class="n">@if (idx < flowIndex()) { <app-icon name="check" [size]="13" /> } @else { {{ idx + 1 }} }</span>
                {{ statusLabel(s) }}
              </li>
              @if (idx < flow.length - 1) { <li class="bar" [class.done]="idx < flowIndex()" aria-hidden="true"></li> }
            }
          </ol>
        }

        <div class="layout">
          <div class="stack-lg">
            <section class="panel">
              <div class="panel-head"><h2>Description</h2></div>
              <div class="panel-body"><p class="desc">{{ i.description }}</p></div>
            </section>

            @if (i.resolutionNotes || i.rootCause) {
              <section class="panel resolution">
                <div class="panel-head"><h2>Resolution</h2></div>
                <div class="panel-body stack">
                  <div><h3>What fixed it</h3><p>{{ i.resolutionNotes }}</p></div>
                  <hr class="divider" />
                  <div><h3>Root cause</h3><p>{{ i.rootCause }}</p></div>
                </div>
              </section>
            }

            <section class="panel">
              <div class="tabs" style="padding:0 8px" role="tablist">
                <button type="button" class="tab" role="tab" [class.active]="tab() === 'activity'" [attr.aria-selected]="tab() === 'activity'" (click)="tab.set('activity')">
                  Activity @if (history().length) { <span class="faint num">{{ history().length }}</span> }
                </button>
                <button type="button" class="tab" role="tab" [class.active]="tab() === 'comments'" [attr.aria-selected]="tab() === 'comments'" (click)="tab.set('comments')">
                  Comments @if (comments().length) { <span class="faint num">{{ comments().length }}</span> }
                </button>
              </div>

              @if (tab() === 'activity') {
                <div class="panel-body">
                  @if (history().length === 0) {
                    <p class="muted">No activity recorded yet.</p>
                  } @else {
                    <ol class="timeline">
                      @for (h of history(); track h.id) {
                        <li class="tl">
                          <span class="dot"></span>
                          <div>
                            <div class="tl-title">{{ h.action }}</div>
                            <div class="tl-meta">
                              {{ dir.actorName(h.userId) }}@if (h.createdAt) { <span> – {{ h.createdAt | rel }}</span> }
                            </div>
                            @if (h.oldValue || h.newValue) {
                              <div class="tl-change">
                                @if (h.oldValue) { <span>{{ pretty(h.oldValue) }}</span> }
                                @if (h.oldValue && h.newValue) { <span class="arrow">to</span> }
                                @if (h.newValue) { <strong>{{ pretty(h.newValue) }}</strong> }
                              </div>
                            }
                          </div>
                        </li>
                      }
                    </ol>
                  }
                </div>
              } @else {
                <div class="panel-body">
                  <form [formGroup]="commentForm" (ngSubmit)="addComment(i)" class="stack" novalidate>
                    <div class="field">
                      <label for="c-text" class="sr-only">Add a comment</label>
                      <textarea id="c-text" class="textarea" rows="3" formControlName="comment" maxlength="2000" placeholder="Share an update with the team"></textarea>
                    </div>
                    <div class="row">
                      @if (!commentsListed) {
                        <span class="small faint" style="flex:1">Comments are saved to the incident. Earlier comments cannot be listed yet, so only the ones you add in this visit appear below.</span>
                      } @else { <span class="spacer"></span> }
                      <button type="submit" class="btn btn-primary" [disabled]="commentBusy() || commentForm.invalid">
                        @if (commentBusy()) { <span class="spinner"></span> } <app-icon name="send" /> Add comment
                      </button>
                    </div>
                  </form>
                  @if (comments().length > 0) {
                    <div style="margin-top:14px">
                      @for (c of comments(); track c.id) {
                        <div class="comment">
                          <span class="avatar avatar-sm" aria-hidden="true">{{ initials(c.userId) }}</span>
                          <div>
                            <div class="row" style="gap:8px"><span class="strong">{{ dir.actorName(c.userId) }}</span><span class="small faint">{{ c.createdAt | rel }}</span></div>
                            <p>{{ c.comment }}</p>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </section>
          </div>

          <aside class="panel">
            <div class="side-block">
              <h3>SLA</h3>
              @if (i.status === Status.Cancelled) {
                <p class="muted small">SLA clocks stopped when the incident was cancelled.</p>
              } @else {
                <div class="rails">
                  <div>
                    <app-sla-rail label="Response" [startAt]="i.createdAt" [dueAt]="i.responseDueAt" [doneAt]="i.respondedAt" />
                    <div class="due"><span>Due</span><span>{{ i.responseDueAt | dt }}</span></div>
                  </div>
                  <div>
                    <app-sla-rail label="Resolution" [startAt]="i.createdAt" [dueAt]="i.resolutionDueAt" [doneAt]="i.resolvedAt" />
                    <div class="due"><span>Due</span><span>{{ i.resolutionDueAt | dt }}</span></div>
                  </div>
                </div>
              }
            </div>
            <div class="side-block">
              <h3>Details</h3>
              <dl class="kv">
                <dt>Team</dt><dd>{{ i.assignedTeamId ? dir.teamName(i.assignedTeamId) : 'Not assigned' }}</dd>
                <dt>Assignee</dt><dd><app-person [id]="i.assignedUserId" [emptyLabel]="i.assignedTeamId ? 'Whole team' : 'Unassigned'" /></dd>
                <dt>Opened by</dt><dd><app-person [id]="i.createdByUserId" [you]="true" /></dd>
                <dt>Opened</dt><dd>{{ i.createdAt | dt }}</dd>
                @if (i.respondedAt) { <dt>First response</dt><dd>{{ i.respondedAt | dt }}</dd> }
                @if (i.updatedAt) { <dt>Last edited</dt><dd>{{ i.updatedAt | dt }}</dd> }
                @if (i.resolvedAt) { <dt>Resolved</dt><dd>{{ i.resolvedAt | dt }}</dd> }
                @if (i.closedAt) { <dt>Closed</dt><dd>{{ i.closedAt | dt }}</dd> }
              </dl>
            </div>
          </aside>
        </div>

        @if (editing()) {
          <app-incident-form [incident]="i" (closed)="editing.set(false)" (saved)="onEdited($event)" />
        }
        @if (assigning()) {
          <app-assign-dialog [incident]="i" (closed)="assigning.set(false)" (assigned)="afterAction(assigning)" />
        }
        @if (resolving()) {
          <app-resolve-dialog [incident]="i" (closed)="resolving.set(false)" (resolved)="afterAction(resolving)" />
        }
      }
    </div>
  `,
})
export class IncidentDetailComponent {
  private readonly api = inject(IncidentApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly dir = inject(DirectoryService);

  /** route param :id */
  readonly id = input.required<string>();

  protected readonly Status = IncidentStatus;
  protected readonly can = can;
  protected readonly flow = FLOW;
  protected readonly commentsListed = environment.features.incidentCommentsList;
  /** Only roles that may read teams can pick a team (the assign dialog needs the team list). */
  protected readonly canAssign = this.auth.hasAnyRole(ACCESS.teams);

  protected readonly incident = signal<Incident | null>(null);
  protected readonly history = signal<IncidentHistoryEntry[]>([]);
  protected readonly comments = signal<IncidentComment[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  protected readonly commentBusy = signal(false);
  protected readonly tab = signal<Tab>('activity');
  protected readonly editing = signal(false);
  protected readonly assigning = signal(false);
  protected readonly resolving = signal(false);

  protected readonly flowIndex = computed(() => {
    const s = this.incident()?.status;
    return s === undefined ? 0 : FLOW.indexOf(s);
  });

  protected readonly commentForm = this.fb.group({
    comment: ['', [Validators.required, Validators.maxLength(2000), Validators.pattern(/\S/)]],
  });

  protected statusLabel = (s: IncidentStatus) => STATUS_LABEL[s];
  protected initials = (userId: string) => {
    const name = this.dir.actorName(userId);
    return name === 'You' ? 'Y' : (name.match(/\b\w/g) ?? ['?']).slice(0, 2).join('').toUpperCase();
  };

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => {
        this.incident.set(null);
        this.comments.set([]);
        this.load(id);
      });
    });
  }

  protected reload(): void {
    this.load(this.id());
  }

  private load(id: string): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      incident: this.api.get(id),
      history: this.api.history(id).pipe(catchError(() => of([] as IncidentHistoryEntry[]))),
      comments: environment.features.incidentCommentsList
        ? this.api.comments(id).pipe(catchError(() => of(null)))
        : of(null),
    }).subscribe({
      next: ({ incident, history, comments }) => {
        this.incident.set(incident);
        this.history.set(history);
        if (comments) this.comments.set([...comments].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }

  /** Runs a state-changing call, then refreshes the incident and its activity. */
  private act(call: Observable<unknown>, success: string): void {
    this.busy.set(true);
    call.subscribe({
      next: () => {
        this.toast.success(success);
        this.busy.set(false);
        this.reload();
      },
      error: (e) => {
        this.busy.set(false);
        this.toast.fromError(e);
        this.reload();
      },
    });
  }

  protected start(i: Incident): void {
    this.act(this.api.start(i.id), 'Work started. The response clock stopped.');
  }

  protected async close(i: Incident): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Close this incident?',
      message: `${i.incidentNumber} will be closed and can no longer be edited.`,
      confirmText: 'Close incident',
    });
    if (ok) this.act(this.api.close(i.id), 'Incident closed.');
  }

  protected async cancel(i: Incident): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Cancel this incident?',
      message: `${i.incidentNumber} will be marked as cancelled and its SLA clocks will stop. This cannot be undone.`,
      confirmText: 'Cancel incident',
      cancelText: 'Keep open',
      danger: true,
    });
    if (ok) this.act(this.api.cancel(i.id), 'Incident cancelled.');
  }

  protected onEdited(updated: Incident): void {
    this.editing.set(false);
    this.incident.set(updated);
    this.reload();
  }

  protected afterAction(dialog: { set(v: boolean): void }): void {
    dialog.set(false);
    this.reload();
  }

  protected addComment(i: Incident): void {
    if (this.commentForm.invalid) return;
    const text = this.commentForm.getRawValue().comment.trim();
    this.commentBusy.set(true);
    this.api.addComment(i.id, text).subscribe({
      next: (c) => {
        this.comments.update((list) => [c, ...list]);
        this.commentForm.reset({ comment: '' });
        this.commentBusy.set(false);
        this.toast.success('Comment added.');
      },
      error: (e) => {
        this.commentBusy.set(false);
        this.toast.fromError(e);
      },
    });
  }

  /** History values for assignment look like "TeamId: <guid>, UserId: <guid>, Status: Assigned" – show names instead. */
  protected pretty(value: string): string {
    return value
      .replace(/TeamId: ([0-9a-f-]{36})/gi, (_m, id: string) => `Team: ${this.dir.teamName(id)}`)
      .replace(/UserId: ([0-9a-f-]{36})/gi, (_m, id: string) => `Assignee: ${this.dir.userName(id)}`)
      .replace(/TeamId: (,|$)/g, 'Team: none$1')
      .replace(/UserId: (,|$)/g, 'Assignee: none$1')
      .replace(/\bInProgress\b/g, 'In progress');
  }
}
