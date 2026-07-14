import { describe, it, expect } from "vitest";
import { Role } from "@prisma/client";
import { hasPermission, assertPermission } from "./rbac";

describe("Role-Based Access Control (RBAC) Permissions", () => {
  it("allows Organization Owner to perform all administrative and financial actions", () => {
    expect(hasPermission(Role.ORGANIZATION_OWNER, "read_financial_reports")).toBe(true);
    expect(hasPermission(Role.ORGANIZATION_OWNER, "manage_integrations")).toBe(true);
    expect(hasPermission(Role.ORGANIZATION_OWNER, "approve_recommendations")).toBe(true);
    expect(hasPermission(Role.ORGANIZATION_OWNER, "verify_realized_savings")).toBe(true);
    expect(hasPermission(Role.ORGANIZATION_OWNER, "manage_organization")).toBe(true);
  });

  it("permits Finance Manager to review invoices, approve recommendations, and verify savings", () => {
    expect(hasPermission(Role.FINANCE_MANAGER, "read_financial_reports")).toBe(true);
    expect(hasPermission(Role.FINANCE_MANAGER, "view_invoices_contracts")).toBe(true);
    expect(hasPermission(Role.FINANCE_MANAGER, "approve_recommendations")).toBe(true);
    expect(hasPermission(Role.FINANCE_MANAGER, "verify_realized_savings")).toBe(true);
    // Finance Manager cannot configure integration credentials or delete org
    expect(hasPermission(Role.FINANCE_MANAGER, "manage_integrations")).toBe(false);
    expect(hasPermission(Role.FINANCE_MANAGER, "manage_organization")).toBe(false);
  });

  it("permits Engineering Manager to inspect AI spend and implement recommendations, but NOT manage billing credentials or declare verified savings", () => {
    expect(hasPermission(Role.ENGINEERING_MANAGER, "view_ai_spend")).toBe(true);
    expect(hasPermission(Role.ENGINEERING_MANAGER, "implement_recommendations")).toBe(true);
    expect(hasPermission(Role.ENGINEERING_MANAGER, "manage_integrations")).toBe(false);
    expect(hasPermission(Role.ENGINEERING_MANAGER, "verify_realized_savings")).toBe(false);
  });

  it("restricts Analyst / Viewer from altering subscriptions, approving recommendations, or declaring savings realized", () => {
    expect(hasPermission(Role.ANALYST_VIEWER, "read_financial_reports")).toBe(true);
    expect(hasPermission(Role.ANALYST_VIEWER, "view_ai_spend")).toBe(true);
    expect(hasPermission(Role.ANALYST_VIEWER, "import_financial_records")).toBe(false);
    expect(hasPermission(Role.ANALYST_VIEWER, "manage_subscriptions")).toBe(false);
    expect(hasPermission(Role.ANALYST_VIEWER, "approve_recommendations")).toBe(false);
    expect(hasPermission(Role.ANALYST_VIEWER, "verify_realized_savings")).toBe(false);
  });

  it("assertPermission throws explicit error on forbidden operation", () => {
    expect(() => {
      assertPermission(Role.ANALYST_VIEWER, "verify_realized_savings");
    }).toThrow(/Access Denied/);
  });
});

