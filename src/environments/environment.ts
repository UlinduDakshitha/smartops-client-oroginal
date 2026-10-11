// Development settings (used by `ng serve`).
// Backend: SmartOps.API -> http profile listens on http://localhost:5181
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5181/api',
  hubUrl: 'http://localhost:5181/hubs/notifications',
  features: {
    // The API currently has POST /api/incident/{id}/comments but no GET.
    // Flip to true after you add GET /api/incident/{id}/comments returning IncidentCommentResponse[].
    incidentCommentsList: false,
  },
};
