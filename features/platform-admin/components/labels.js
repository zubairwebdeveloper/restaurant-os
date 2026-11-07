export const AUDIT_LABELS = {
  SUPER_ADMIN_BOOTSTRAPPED: "Super admin created",
  APPLICATION_SUBMITTED: "Application submitted",
  APPLICATION_APPROVED: "Application approved",
  APPLICATION_REJECTED: "Application rejected",
  TENANT_CREATED: "Restaurant created",
  TENANT_SUSPENDED: "Restaurant suspended",
  TENANT_REACTIVATED: "Restaurant reactivated",
};

export const auditLabel = (action) => AUDIT_LABELS[action] ?? action;
