import { IconName } from '../../shared/ui/icon.component';

/** Maps the `type` strings the API creates (see IncidentService) to an icon. */
export function notificationIcon(type: string): IconName {
  switch (type) {
    case 'IncidentAssignment': return 'user-plus';
    case 'IncidentResolution': return 'check-circle';
    case 'IncidentClosure': return 'lock';
    case 'IncidentCancellation': return 'x';
    default: return 'bell';
  }
}

/** Notification text looks like "Incident INC-20261010… has been assigned to you." */
export function incidentNumberOf(message: string): string | null {
  return /INC-\d+/.exec(message)?.[0] ?? null;
}
