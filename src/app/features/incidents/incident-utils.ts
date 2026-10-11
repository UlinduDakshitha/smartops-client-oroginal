import { Incident, IncidentStatus } from '../../core/models/models';

export interface SlaClock {
  label: string;
  startAt: string;
  dueAt: string | null;
  doneAt: string | null;
  inactive: boolean;
}

/**
 * The clock that matters right now:
 * New/Assigned -> response clock, In progress -> resolution clock, Resolved/Closed -> how resolution went.
 */
export function activeClock(i: Incident): SlaClock {
  switch (i.status) {
    case IncidentStatus.Cancelled:
      return { label: '', startAt: i.createdAt, dueAt: null, doneAt: null, inactive: true };
    case IncidentStatus.New:
    case IncidentStatus.Assigned:
      return { label: 'Respond', startAt: i.createdAt, dueAt: i.responseDueAt, doneAt: i.respondedAt, inactive: false };
    default:
      return { label: 'Resolve', startAt: i.createdAt, dueAt: i.resolutionDueAt, doneAt: i.resolvedAt, inactive: false };
  }
}

export const OPEN_STATUSES: IncidentStatus[] = [IncidentStatus.New, IncidentStatus.Assigned, IncidentStatus.InProgress];

export function isOpen(i: Incident): boolean {
  return OPEN_STATUSES.includes(i.status);
}

export function needsAttention(i: Incident): boolean {
  return isOpen(i) && (i.responseSlaBreached || i.resolutionSlaBreached || i.responseSlaAtRisk || i.resolutionSlaAtRisk);
}

export const can = {
  edit: (i: Incident) => i.status !== IncidentStatus.Closed && i.status !== IncidentStatus.Cancelled,
  assign: (i: Incident) => i.status === IncidentStatus.New || i.status === IncidentStatus.Assigned,
  start: (i: Incident) => i.status === IncidentStatus.Assigned,
  resolve: (i: Incident) => i.status === IncidentStatus.InProgress,
  close: (i: Incident) => i.status === IncidentStatus.Resolved,
  cancel: (i: Incident) => isOpen(i),
};
