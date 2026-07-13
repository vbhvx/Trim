import { Role } from "@prisma/client";

export type Permission =
  | "read_financial_reports"
  | "view_invoices_contracts"
  | "manage_integrations"
  | "import_financial_records"
  | "manage_subscriptions"
  | "manage_license_assignments"
  | "view_ai_spend"
  | "run_cost_analysis"
  | "approve_recommendations"
  | "reject_recommendations"
  | "implement_recommendations"
  | "verify_realized_savings"
  | "export_financial_reports"
  | "manage_users_and_roles"
  | "manage_organization";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ORGANIZATION_OWNER: [
    "read_financial_reports",
    "view_invoices_contracts",
    "manage_integrations",
    "import_financial_records",
    "manage_subscriptions",
    "manage_license_assignments",
    "view_ai_spend",
    "run_cost_analysis",
    "approve_recommendations",
    "reject_recommendations",
    "implement_recommendations",
    "verify_realized_savings",
    "export_financial_reports",
    "manage_users_and_roles",
    "manage_organization",
  ],
  ADMIN: [
    "read_financial_reports",
    "view_invoices_contracts",
    "manage_integrations",
    "import_financial_records",
    "manage_subscriptions",
    "manage_license_assignments",
    "view_ai_spend",
    "run_cost_analysis",
    "approve_recommendations",
    "reject_recommendations",
    "implement_recommendations",
    "verify_realized_savings",
    "export_financial_reports",
    "manage_users_and_roles",
  ],
  FINANCE_MANAGER: [
    "read_financial_reports",
    "view_invoices_contracts",
    "import_financial_records",
    "manage_subscriptions",
    "manage_license_assignments",
    "view_ai_spend",
    "run_cost_analysis",
    "approve_recommendations",
    "reject_recommendations",
    "implement_recommendations",
    "verify_realized_savings",
    "export_financial_reports",
  ],
  ENGINEERING_MANAGER: [
    "read_financial_reports",
    "view_ai_spend",
    "run_cost_analysis",
    "implement_recommendations",
    "export_financial_reports",
  ],
  IT_ADMIN: [
    "read_financial_reports",
    "view_invoices_contracts",
    "import_financial_records",
    "manage_subscriptions",
    "manage_license_assignments",
    "view_ai_spend",
    "run_cost_analysis",
    "implement_recommendations",
    "export_financial_reports",
  ],
  ANALYST_VIEWER: [
    "read_financial_reports",
    "view_ai_spend",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export function assertPermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(
      `Access Denied: Role '${role}' lacks required permission '${permission}'`
    );
  }
}

