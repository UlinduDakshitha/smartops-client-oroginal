import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IncidentStatus, LEVEL_LABEL, STATUS_LABEL } from '../../core/models/models';

const STATUS_TONE: Record<IncidentStatus, string> = {
  [IncidentStatus.New]: 'info',
  [IncidentStatus.Assigned]: 'violet',
  [IncidentStatus.InProgress]: 'brand',
  [IncidentStatus.Resolved]: 'ok',
  [IncidentStatus.Closed]: 'muted',
  [IncidentStatus.Cancelled]: 'muted',
};

const LEVEL_TONE: Record<number, string> = { 0: 'muted', 1: 'info', 2: 'warn', 3: 'danger' };

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="'badge badge-' + tone()">{{ label() }}</span>`,
})
export class StatusBadgeComponent {
  readonly status = input.required<IncidentStatus>();
  protected readonly tone = computed(() => STATUS_TONE[this.status()]);
  protected readonly label = computed(() => STATUS_LABEL[this.status()]);
}

/** Priority or severity: both are Low/Medium/High/Critical. */
@Component({
  selector: 'app-level-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="'badge badge-' + tone()">{{ label() }}</span>`,
})
export class LevelBadgeComponent {
  readonly level = input.required<number>();
  protected readonly tone = computed(() => LEVEL_TONE[this.level()] ?? 'muted');
  protected readonly label = computed(() => LEVEL_LABEL[this.level()] ?? '–');
}
