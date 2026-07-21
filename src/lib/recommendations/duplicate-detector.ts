import { Subscription, Vendor, SubscriptionStatus } from "@prisma/client";
import { Decimal, roundToCents, toDecimal } from "../financial/decimal";
import prisma from "../prisma";

export type DuplicateClassification =
  | "CONFIRMED_DUPLICATE"
  | "LIKELY_DUPLICATE"
  | "POTENTIAL_OVERLAP"
  | "INSUFFICIENT_EVIDENCE";

export interface DuplicateDetectionCandidate {
  primarySubscription: Subscription & { vendor: Vendor };
  duplicateSubscription: Subscription & { vendor: Vendor };
  classification: DuplicateClassification;
  confidenceScore: number; // 0 to 1
  signalsMatched: string[];
  areasOfSimilarity: string[];
  justifyingDifferences: string[];
  estimatedMonthlySavings: Decimal;
  potentialAnnualSavings: Decimal;
  requiredVerificationSteps: string[];
}

export async function detectDuplicateAndOverlappingSubscriptions(
  organizationId: string
): Promise<DuplicateDetectionCandidate[]> {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      organizationId,
      status: { notIn: [SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED] },
    },
    include: { vendor: true, owner: true },
  });

  const candidates: DuplicateDetectionCandidate[] = [];

  for (let i = 0; i < subscriptions.length; i++) {
    for (let j = i + 1; j < subscriptions.length; j++) {
      const subA = subscriptions[i];
      const subB = subscriptions[j];

      const signals: string[] = [];
      const similarity: string[] = [];
      const differences: string[] = [];
      let score = 0;

      const sameVendor =
        subA.vendor.name.trim().toLowerCase() === subB.vendor.name.trim().toLowerCase();
      const sameProduct =
        subA.productName.trim().toLowerCase() === subB.productName.trim().toLowerCase();
      const sameCategory =
        subA.vendor.category.trim().toLowerCase() === subB.vendor.category.trim().toLowerCase();

      // Check external ID match (strongest signal)
      if (
        subA.sourceReference &&
        subB.sourceReference &&
        subA.sourceReference === subB.sourceReference
      ) {
        signals.push("Identical sourceReference or external subscription ID");
        score += 0.95;
      }

      if (sameVendor) {
        signals.push(`Identical vendor '${subA.vendor.name}'`);
        score += 0.3;
        similarity.push(`Both billed under vendor '${subA.vendor.name}'`);
      }

      if (sameProduct) {
        signals.push(`Identical product name '${subA.productName}'`);
        score += 0.4;
        similarity.push(`Both provide '${subA.productName}' access`);
      } else if (sameCategory) {
        signals.push(`Identical software category '${subA.vendor.category}'`);
        similarity.push(`Both operate in the '${subA.vendor.category}' software category`);
        score += 0.2;
      }

      // Check owner and billing intervals
      if (subA.ownerId && subB.ownerId && subA.ownerId === subB.ownerId) {
        signals.push("Same internal owner");
        similarity.push("Assigned to the same subscription owner");
        score += 0.15;
      } else if (subA.ownerId !== subB.ownerId) {
        differences.push("Different internal owners or departmental teams");
      }

      if (subA.planName === subB.planName) {
        similarity.push(`Identical plan tier '${subA.planName}'`);
        score += 0.1;
      } else {
        differences.push(
          `Different plan tiers: '${subA.planName}' vs '${subB.planName}'`
        );
      }

      // Classify
      let classification: DuplicateClassification = "INSUFFICIENT_EVIDENCE";
      if (score >= 0.85) {
        classification = "CONFIRMED_DUPLICATE";
      } else if (score >= 0.6) {
        classification = "LIKELY_DUPLICATE";
      } else if (sameCategory && !sameProduct) {
        classification = "POTENTIAL_OVERLAP";
      }

      if (
        classification === "CONFIRMED_DUPLICATE" ||
        classification === "LIKELY_DUPLICATE" ||
        (classification === "POTENTIAL_OVERLAP" && score >= 0.3)
      ) {
        // Potential savings from consolidating the less expensive or secondary subscription
        const costA = toDecimal(subA.expectedAmount);
        const costB = toDecimal(subB.expectedAmount);
        const monthlyA =
          subA.billingInterval === "ANNUAL" ? costA.dividedBy(12) : costA;
        const monthlyB =
          subB.billingInterval === "ANNUAL" ? costB.dividedBy(12) : costB;

        // Candidate for elimination is typically the smaller or unassigned one
        const estimatedMonthlySavings = roundToCents(
          monthlyA.lessThan(monthlyB) ? monthlyA : monthlyB
        );
        const potentialAnnualSavings = roundToCents(
          estimatedMonthlySavings.times(12)
        );

        candidates.push({
          primarySubscription: monthlyA.greaterThanOrEqualTo(monthlyB) ? subA : subB,
          duplicateSubscription: monthlyA.greaterThanOrEqualTo(monthlyB) ? subB : subA,
          classification,
          confidenceScore: Math.min(1.0, score),
          signalsMatched: signals,
          areasOfSimilarity: similarity,
          justifyingDifferences: differences,
          estimatedMonthlySavings,
          potentialAnnualSavings,
          requiredVerificationSteps: [
            "Confirm whether separate subscriptions are required for data isolation or compliance",
            "Audit active seat users on both subscriptions before consolidating",
            "Review remaining contractual commitments and cancellation terms",
          ],
        });
      }
    }
  }

  return candidates;
}

