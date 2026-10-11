import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin, of, catchError } from 'rxjs';
import { TeamApi } from '../api/team.api';
import { UserApi } from '../api/user.api';
import { ACCESS, ROLE, Team, User } from '../models/models';
import { AuthService } from './auth.service';

/**
 * The incident API only returns ids for people and teams. This service resolves ids to names
 * using whatever the signed-in user is allowed to read:
 *   Administrator -> all users + teams,  Team Lead -> teams + their members,  others -> ids only.
 */
@Injectable({ providedIn: 'root' })
export class DirectoryService {
  private readonly auth = inject(AuthService);
  private readonly userApi = inject(UserApi);
  private readonly teamApi = inject(TeamApi);

  private readonly userMap = signal<Record<string, User>>({});
  readonly teams = signal<Team[]>([]);
  private readonly teamMap = computed(() => Object.fromEntries(this.teams().map((t) => [t.id, t])));
  readonly ready = signal(false);
  private loading = false;

  load(force = false): void {
    if (this.loading || (this.ready() && !force)) return;
    const roles = this.auth.roles();
    const isAdmin = roles.includes(ROLE.Administrator);
    const canTeams = this.auth.hasAnyRole(ACCESS.teams);
    if (!canTeams) {
      this.ready.set(true);
      return;
    }
    this.loading = true;
    const done = () => {
      this.loading = false;
      this.ready.set(true);
    };

    this.teamApi.list().pipe(catchError(() => of([] as Team[]))).subscribe((teams) => {
      this.teams.set(teams);
      if (isAdmin) {
        this.userApi.list().pipe(catchError(() => of({ users: [] as User[], totalCount: 0 }))).subscribe((res) => {
          this.userMap.set(Object.fromEntries(res.users.map((u) => [u.id, u])));
          done();
        });
      } else if (teams.length === 0) {
        done();
      } else {
        forkJoin(teams.map((t) => this.teamApi.members(t.id).pipe(catchError(() => of([] as User[]))))).subscribe(
          (lists) => {
            this.userMap.set(Object.fromEntries(lists.flat().map((u) => [u.id, u])));
            done();
          },
        );
      }
    });
  }

  reset(): void {
    this.userMap.set({});
    this.teams.set([]);
    this.ready.set(false);
    this.loading = false;
  }

  user(id: string | null | undefined): User | undefined {
    return id ? this.userMap()[id] : undefined;
  }

  /** Display name, falling back to a short id when the current role cannot read the user list. */
  userName(id: string | null | undefined): string {
    if (!id) return 'Unassigned';
    const u = this.userMap()[id];
    if (u) return u.fullName;
    return `User ${id.slice(0, 8)}`;
  }

  /** Same as userName but says "You" for the signed-in user. */
  actorName(id: string | null | undefined): string {
    if (id && id === this.auth.user()?.id) return 'You';
    return this.userName(id);
  }

  team(id: string | null | undefined): Team | undefined {
    return id ? this.teamMap()[id] : undefined;
  }

  teamName(id: string | null | undefined): string {
    if (!id) return 'No team';
    return this.teamMap()[id]?.name ?? `Team ${id.slice(0, 8)}`;
  }
}
