import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IncidentApi } from '../../core/api/incident.api';
import { TeamApi } from '../../core/api/team.api';
import { Incident, Team, User } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';
import { toApiError } from '../../core/util/errors';
import { ModalComponent } from '../../shared/ui/modal.component';

@Component({
  selector: 'app-assign-dialog',
  imports: [FormsModule, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [title]="incident().assignedTeamId ? 'Reassign incident' : 'Assign incident'" size="sm" [busy]="busy()" (closed)="closed.emit()">
      @if (loading()) {
        <div class="stack"><span class="skeleton" style="height:36px"></span><span class="skeleton" style="height:36px"></span></div>
      } @else {
        <div class="stack">
          @if (error()) { <div class="alert alert-error" role="alert">{{ error() }}</div> }
          <div class="field">
            <label for="as-team">Team</label>
            <select id="as-team" class="select" [ngModel]="teamId()" (ngModelChange)="pickTeam($event)">
              <option value="" disabled>Choose a team</option>
              @for (t of teams(); track t.id) { <option [value]="t.id">{{ t.name }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="as-user">Assignee</label>
            <select id="as-user" class="select" [ngModel]="userId()" (ngModelChange)="userId.set($event)" [disabled]="!teamId() || loadingMembers()">
              <option value="">Whole team (no one in particular)</option>
              @for (m of members(); track m.id) {
                <option [value]="m.id" [disabled]="!m.isActive">{{ m.fullName }}{{ m.isActive ? '' : ' (inactive)' }}</option>
              }
            </select>
            <span class="hint">
              @if (teamId() && !loadingMembers() && members().length === 0) { This team has no members yet. }
              @else { Only members of the chosen team can be assigned. They are notified straight away. }
            </span>
          </div>
        </div>
      }
      <ng-container footer>
        <button type="button" class="btn" [disabled]="busy()" (click)="closed.emit()">Cancel</button>
        <button type="button" class="btn btn-primary" [disabled]="busy() || !teamId() || loading()" (click)="save()">
          @if (busy()) { <span class="spinner"></span> } Assign
        </button>
      </ng-container>
    </app-modal>
  `,
})
export class AssignDialogComponent implements OnInit {
  private readonly incidents = inject(IncidentApi);
  private readonly teamApi = inject(TeamApi);
  private readonly toast = inject(ToastService);

  readonly incident = input.required<Incident>();
  readonly assigned = output<void>();
  readonly closed = output<void>();

  protected readonly teams = signal<Team[]>([]);
  protected readonly members = signal<User[]>([]);
  protected readonly teamId = signal('');
  protected readonly userId = signal('');
  protected readonly loading = signal(true);
  protected readonly loadingMembers = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.teamApi.list().subscribe({
      next: (teams) => {
        this.teams.set(teams);
        this.loading.set(false);
        const current = this.incident();
        if (current.assignedTeamId && teams.some((t) => t.id === current.assignedTeamId)) {
          this.pickTeam(current.assignedTeamId, current.assignedUserId ?? '');
        }
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }

  protected pickTeam(id: string, preselectUser = ''): void {
    this.teamId.set(id);
    this.userId.set('');
    this.members.set([]);
    if (!id) return;
    this.loadingMembers.set(true);
    this.teamApi.members(id).subscribe({
      next: (list) => {
        this.members.set(list);
        this.loadingMembers.set(false);
        if (preselectUser && list.some((m) => m.id === preselectUser)) this.userId.set(preselectUser);
      },
      error: (e) => {
        this.loadingMembers.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }

  protected save(): void {
    this.error.set('');
    this.busy.set(true);
    this.incidents.assign(this.incident().id, { teamId: this.teamId(), userId: this.userId() || null }).subscribe({
      next: () => {
        this.toast.success('Incident assigned.');
        this.assigned.emit();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }
}
