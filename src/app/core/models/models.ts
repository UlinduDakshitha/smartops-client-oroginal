// ---- Enums (the API serialises enums as integers) -------------------------
export enum Priority { Low = 0, Medium = 1, High = 2, Critical = 3 }
export enum Severity { Low = 0, Medium = 1, High = 2, Critical = 3 }
export enum IncidentStatus {
  New = 0,
  Assigned = 1,
  InProgress = 2,
  Resolved = 3,
  Closed = 4,
  Cancelled = 5,
}

export const PRIORITIES = [Priority.Low, Priority.Medium, Priority.High, Priority.Critical] as const;
export const SEVERITIES = [Severity.Low, Severity.Medium, Severity.High, Severity.Critical] as const;
export const STATUSES = [
  IncidentStatus.New,
  IncidentStatus.Assigned,
  IncidentStatus.InProgress,
  IncidentStatus.Resolved,
  IncidentStatus.Closed,
  IncidentStatus.Cancelled,
] as const;

export const STATUS_LABEL: Record<IncidentStatus, string> = {
  [IncidentStatus.New]: 'New',
  [IncidentStatus.Assigned]: 'Assigned',
  [IncidentStatus.InProgress]: 'In progress',
  [IncidentStatus.Resolved]: 'Resolved',
  [IncidentStatus.Closed]: 'Closed',
  [IncidentStatus.Cancelled]: 'Cancelled',
};
export const LEVEL_LABEL: Record<number, string> = { 0: 'Low', 1: 'Medium', 2: 'High', 3: 'Critical' };

// ---- Roles -----------------------------------------------------------------
export const ROLE = {
  Administrator: 'Administrator',
  SupportAgent: 'Support Agent',
  TeamLead: 'Team Lead',
  Engineer: 'Engineer',
  Manager: 'Manager',
} as const;
export type RoleName = (typeof ROLE)[keyof typeof ROLE];

// Mirrors the authorization policies in SmartOps.API/Program.cs
export const ACCESS: Record<'dashboard' | 'incidents' | 'teams' | 'adminOnly', string[]> = {
  dashboard: [ROLE.Administrator, ROLE.Manager],
  incidents: [ROLE.Administrator, ROLE.TeamLead, ROLE.SupportAgent, ROLE.Engineer],
  teams: [ROLE.Administrator, ROLE.TeamLead],
  adminOnly: [ROLE.Administrator],
};

// ---- Auth ------------------------------------------------------------------
export interface LoginRequest { email: string; password: string }
export interface LoginResponse { accessToken: string; refreshToken: string; accessTokenExpiresAt: string }
export interface RegisterRequest { fullName: string; email: string; password: string }
export interface RegisterResponse { userId: string; fullName: string; email: string; message: string }
export interface AuthUser { id: string; email: string; roles: string[] }

// ---- Incidents -------------------------------------------------------------
export interface Incident {
  id: string;
  incidentNumber: string;
  title: string;
  description: string;
  priority: Priority;
  severity: Severity;
  status: IncidentStatus;
  createdByUserId: string;
  assignedTeamId: string | null;
  assignedUserId: string | null;
  responseDueAt: string | null;
  resolutionDueAt: string | null;
  respondedAt: string | null;
  responseSlaBreached: boolean;
  resolutionSlaBreached: boolean;
  responseSlaAtRisk: boolean;
  resolutionSlaAtRisk: boolean;
  createdAt: string;
  updatedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  resolutionNotes: string | null;
  rootCause: string | null;
}
export interface IncidentPage {
  items: Incident[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
export interface IncidentInput { title: string; description: string; priority: Priority; severity: Severity }
export interface AssignInput { teamId: string; userId: string | null }
export interface ResolveInput { resolutionNotes: string; rootCause: string }
export interface IncidentComment { id: string; incidentId: string; userId: string; comment: string; createdAt: string }
export interface IncidentHistoryEntry {
  id: string;
  incidentId: string;
  userId: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt?: string; // not exposed by the API today; used if it is added later
}
export interface IncidentFilter {
  status?: IncidentStatus | null;
  priority?: Priority | null;
  severity?: Severity | null;
}

// ---- Teams / users / roles -------------------------------------------------
export interface Team {
  id: string;
  name: string;
  description: string;
  teamLeadId: string | null;
  createdAt: string;
  updatedAt: string | null;
}
export interface TeamInput { name: string; description: string }
export interface User { id: string; fullName: string; email: string; isActive: boolean; createdAt: string }
export interface UserList { users: User[]; totalCount: number }
export interface CreateUserInput { fullName: string; email: string; password: string; roleId: string }
export interface UpdateUserInput { fullName: string; email: string }
export interface Role { id: string; name: string; description: string }

// ---- SLA -------------------------------------------------------------------
export interface SlaPolicy {
  id: string;
  name: string;
  priority: Priority;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  createdAt: string;
  updatedAt: string | null;
}
export interface SlaPolicyInput {
  name: string;
  priority: Priority;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
}

// ---- Dashboard -------------------------------------------------------------
export interface DashboardSummary {
  totalIncidents: number;
  newIncidents: number;
  assignedIncidents: number;
  inProgressIncidents: number;
  resolvedIncidents: number;
  closedIncidents: number;
  cancelledIncidents: number;
  responseSlaBreachedCount: number;
  resolutionSlaBreachedCount: number;
  responseSlaAtRiskCount: number;
  resolutionSlaAtRiskCount: number;
  lowPriorityCount: number;
  mediumPriorityCount: number;
  highPriorityCount: number;
  criticalPriorityCount: number;
  lowSeverityCount: number;
  mediumSeverityCount: number;
  highSeverityCount: number;
  criticalSeverityCount: number;
  averageResolutionTimeMinutes: number;
}
export interface MonthlyTrend {
  year: number;
  month: number;
  monthName: string;
  incidentCount: number;
  resolvedCount: number;
  closedCount: number;
}
export interface TeamWorkload {
  teamId: string;
  teamName: string;
  totalIncidents: number;
  newIncidents: number;
  assignedIncidents: number;
  inProgressIncidents: number;
  resolvedIncidents: number;
  closedIncidents: number;
}

// ---- Notifications / audit -------------------------------------------------
export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}
export interface HubNotification { title: string; message: string; type: string; createdAt: string }
export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entityName: string;
  entityId: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

// ---- Errors ----------------------------------------------------------------
export interface ApiError { status: number; message: string }
