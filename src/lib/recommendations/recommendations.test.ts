import { describe, it, expect } from "vitest";
import prisma from "../prisma";
import { runOptimizationRules } from "./rule-engine";
import { calculateSubscriptionSeatUtilization } from "../analytics/seat-utilization";
import { detectDuplicateAndOverlappingSubscriptions } from "./duplicate-detector";
import { verifyRecommendationSavings } from "../analytics/savings-verification";
import { Role } from "@prisma/client";

describe("Recommendation Engine & Financial Verification", () => {
  it("generates deterministic optimization recommendations for Acme Corp", async () => {
    const acmeOrg = await prisma.organization.findFirst({
      where: { name: "Acme Corporation" },
    });
    expect(acmeOrg).toBeDefined();

    const recs = await runOptimizationRules(acmeOrg!.id);
    expect(recs.length).toBeGreaterThan(0);

    const types = recs.map((r) => r.recommendationType);
    expect(types).toContain("UNASSIGNED_SEATS");
    expect(types).toContain("DUPLICATE_SUBSCRIPTION");
    expect(types).toContain("RENEWAL_REVIEW");
  });

  it("calculates seat utilization and properly distinguishes unknown activity from unused licenses", async () => {
    // 1. Check Figma: 80 purchased, 55 assigned -> 25 unassigned
    const figmaSub = await prisma.subscription.findFirst({
      where: { productName: "Figma Organization" },
    });
    expect(figmaSub).toBeDefined();

    const figmaMetrics = await calculateSubscriptionSeatUtilization(figmaSub!.id);
    expect(figmaMetrics).toBeDefined();
    expect(figmaMetrics!.purchasedSeats).toBe(80);
    expect(figmaMetrics!.assignedSeats).toBe(55);
    expect(figmaMetrics!.unassignedSeats).toBe(25);
    expect(figmaMetrics!.potentialRemovableSeats).toBe(25);
    expect(figmaMetrics!.potentialMonthlySavings.toString()).toBe("1125"); // 25 * $45

    // 2. Check Zoom: 30 seats with NULL lastActivityAt (Vendor doesn't expose activity)
    const zoomSub = await prisma.subscription.findFirst({
      where: { productName: "Zoom Meetings Pro" },
    });
    expect(zoomSub).toBeDefined();

    const zoomMetrics = await calculateSubscriptionSeatUtilization(zoomSub!.id);
    expect(zoomMetrics).toBeDefined();
    expect(zoomMetrics!.hasActivityData).toBe(false);
    expect(zoomMetrics!.activityRatePct).toBeNull(); // Must be null, not 0!
    expect(zoomMetrics!.unknownActivitySeats).toBe(30);
    expect(zoomMetrics!.inactiveSeats).toBe(0); // MUST NOT falsely label as inactive!
    expect(zoomMetrics!.dataQualityNotes[0]).toContain(
      "Vendor does not provide seat activity timestamps"
    );
  });

  it("detects duplicate subscriptions with matching external ID and computes savings", async () => {
    const acmeOrg = await prisma.organization.findFirst({
      where: { name: "Acme Corporation" },
    });
    const duplicates = await detectDuplicateAndOverlappingSubscriptions(acmeOrg!.id);

    const ghDup = duplicates.find(
      (d) =>
        d.duplicateSubscription.productName.includes("GitHub") &&
        d.classification === "CONFIRMED_DUPLICATE"
    );

    expect(ghDup).toBeDefined();
    expect(ghDup!.signalsMatched).toContain(
      "Identical sourceReference or external subscription ID"
    );
    expect(ghDup!.estimatedMonthlySavings.toString()).toBe("1050");
  });

  it("records realized savings only with authorized role, baseline comparison, and evidence reference", async () => {
    const acmeOrg = await prisma.organization.findFirst({
      where: { name: "Acme Corporation" },
    });
    const financeUser = await prisma.user.findFirst({
      where: { email: "finance@acme.com" },
    });
    const viewerUser = await prisma.user.findFirst({
      where: { email: "viewer@acme.com" },
    });

    const rec = await prisma.recommendation.findFirst({
      where: { organizationId: acmeOrg!.id, status: "NEW" },
    });
    expect(rec).toBeDefined();

    // 1. Viewer attempt to verify must fail
    await expect(
      verifyRecommendationSavings({
        recommendationId: rec!.id,
        organizationId: acmeOrg!.id,
        verifiedById: viewerUser!.id,
        userRole: Role.ANALYST_VIEWER,
        actionTaken: "Cut seats",
        implementationDate: new Date(),
        baselineAmount: 2000,
        actualAmountAfter: 1500,
        currency: "USD",
        verificationMethod: "Invoice audit",
        evidenceReference: "INV-12345",
      })
    ).rejects.toThrow(/Access Denied/);

    // 2. Finance Manager verification succeeds
    const result = await verifyRecommendationSavings({
      recommendationId: rec!.id,
      organizationId: acmeOrg!.id,
      verifiedById: financeUser!.id,
      userRole: Role.FINANCE_MANAGER,
      actionTaken: "Removed unassigned seats and lowered tier commit",
      implementationDate: new Date(),
      baselineAmount: 2000,
      actualAmountAfter: 1500,
      currency: "USD",
      verificationMethod: "Audited subsequent monthly vendor invoice",
      evidenceReference: "INV-POST-OPT-99",
      notes: "Measured and realized $500 monthly reduction.",
    });

    expect(result.outcome.realizedSavings.toString()).toBe("500");
    expect(result.recommendation.status).toBe("VERIFIED");
  });
});

