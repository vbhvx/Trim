import { RecommendationStatus, Role } from "@prisma/client";
import { Decimal, roundToCents, toDecimal } from "../financial/decimal";
import prisma from "../prisma";
import { createAuditLog } from "../audit/logger";
import { assertPermission } from "../auth/rbac";

export interface VerifySavingsParams {
  recommendationId: string;
  organizationId: string;
  verifiedById: string;
  userRole: Role;
  actionTaken: string;
  implementationDate: Date;
  baselineAmount: Decimal.Value;
  actualAmountAfter: Decimal.Value;
  currency: string;
  verificationMethod: string;
  evidenceReference: string;
  notes?: string;
}

export async function verifyRecommendationSavings(params: VerifySavingsParams) {
  // Enforce explicit RBAC permission check
  assertPermission(params.userRole, "verify_realized_savings");

  const rec = await prisma.recommendation.findFirst({
    where: {
      id: params.recommendationId,
      organizationId: params.organizationId,
    },
  });

  if (!rec) {
    throw new Error("Recommendation not found or unauthorized");
  }

  // Calculate realized savings deterministically
  const baseline = toDecimal(params.baselineAmount);
  const after = toDecimal(params.actualAmountAfter);
  const realized = roundToCents(baseline.minus(after));

  // Create RecommendationOutcome record
  const outcome = await prisma.recommendationOutcome.create({
    data: {
      recommendationId: rec.id,
      actionTaken: params.actionTaken,
      implementationDate: params.implementationDate,
      baselineAmount: baseline,
      actualAmountAfter: after,
      realizedSavings: realized,
      currency: params.currency.toUpperCase(),
      verificationMethod: params.verificationMethod,
      evidenceReference: params.evidenceReference,
      verifiedById: params.verifiedById,
      verifiedAt: new Date(),
      notes: params.notes || null,
    },
  });

  // Transition recommendation status to VERIFIED (or NOT_REALIZED if savings <= 0)
  const newStatus = realized.greaterThan(0)
    ? RecommendationStatus.VERIFIED
    : RecommendationStatus.NOT_REALIZED;

  const updatedRec = await prisma.recommendation.update({
    where: { id: rec.id },
    data: {
      status: newStatus,
      reviewNotes: params.notes,
    },
  });

  // Create audit log
  await createAuditLog({
    organizationId: params.organizationId,
    userId: params.verifiedById,
    action: "SAVINGS_VERIFIED",
    entityType: "Recommendation",
    entityId: rec.id,
    details: {
      baselineAmount: baseline.toString(),
      actualAmountAfter: after.toString(),
      realizedSavings: realized.toString(),
      currency: params.currency,
      verificationMethod: params.verificationMethod,
      outcomeId: outcome.id,
      status: newStatus,
    },
  });

  return {
    recommendation: updatedRec,
    outcome,
  };
}

