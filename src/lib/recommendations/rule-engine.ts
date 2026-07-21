import {
  RecommendationStatus,
  Priority,
  Confidence,
  Prisma,
} from "@prisma/client";
import { Decimal, roundToCents, toDecimal } from "../financial/decimal";
import prisma from "../prisma";
import { calculateSubscriptionSeatUtilization } from "../analytics/seat-utilization";
import { detectDuplicateAndOverlappingSubscriptions } from "./duplicate-detector";
import { runInvoiceReconciliation } from "../reconciliation/reconciler";
import { getAiSpendAnalytics } from "../analytics/ai-spend";

export interface GeneratedRecommendation {
  recommendationType: string;
  title: string;
  description: string;
  priority: Priority;
  estimatedSavings: Decimal;
  savingsCurrency: string;
  confidence: Confidence;
  vendorId?: string;
  subscriptionId?: string;
  evidenceReferences: Record<string, unknown>;
  assumptions: Record<string, unknown>;
  modelOrRuleVersion: string;
}

export async function runOptimizationRules(
  organizationId: string
): Promise<GeneratedRecommendation[]> {
  const recommendations: GeneratedRecommendation[] = [];

  // --- Rule 1: Unassigned and Inactive Paid Seats ---
  const subscriptions = await prisma.subscription.findMany({
    where: { organizationId, status: "ACTIVE" },
    include: { vendor: true },
  });

  for (const sub of subscriptions) {
    const seatMetrics = await calculateSubscriptionSeatUtilization(sub.id, 30);
    if (!seatMetrics) continue;

    // 1A. Unassigned Paid Seats
    if (seatMetrics.unassignedSeats > 0 && seatMetrics.seatPricePerMonth.greaterThan(0)) {
      const monthlySavings = roundToCents(
        seatMetrics.seatPricePerMonth.times(seatMetrics.unassignedSeats)
      );

      recommendations.push({
        recommendationType: "UNASSIGNED_SEATS",
        title: `Reclaim ${seatMetrics.unassignedSeats} unassigned seats on ${sub.productName}`,
        description: `${sub.vendor.name} ${sub.productName} has ${seatMetrics.unassignedSeats} purchased license seats that have not been assigned to any employee.`,
        priority: monthlySavings.greaterThan(new Decimal(300)) ? Priority.HIGH : Priority.MEDIUM,
        estimatedSavings: monthlySavings,
        savingsCurrency: sub.billingCurrency,
        confidence: Confidence.HIGH,
        vendorId: sub.vendorId,
        subscriptionId: sub.id,
        evidenceReferences: {
          purchasedSeats: seatMetrics.purchasedSeats,
          assignedSeats: seatMetrics.assignedSeats,
          unassignedSeats: seatMetrics.unassignedSeats,
          seatPricePerMonth: seatMetrics.seatPricePerMonth.toString(),
        },
        assumptions: {
          formula: "Unassigned Seats × Unit Price per Seat per Month",
          contractLockInNote: seatMetrics.contractualCommitmentNote,
        },
        modelOrRuleVersion: "rules-seat-v1.0",
      });
    }

    // 1B. Inactive Seats (ONLY when fresh vendor activity data exists)
    if (
      seatMetrics.hasActivityData &&
      seatMetrics.inactiveSeats > 0 &&
      seatMetrics.seatPricePerMonth.greaterThan(0)
    ) {
      const monthlySavings = roundToCents(
        seatMetrics.seatPricePerMonth.times(seatMetrics.inactiveSeats)
      );

      recommendations.push({
        recommendationType: "INACTIVE_SEATS",
        title: `Review ${seatMetrics.inactiveSeats} inactive licenses on ${sub.productName}`,
        description: `${seatMetrics.inactiveSeats} assigned user(s) on ${sub.productName} have zero recorded login or activity signals in the past 30 days.`,
        priority: Priority.MEDIUM,
        estimatedSavings: monthlySavings,
        savingsCurrency: sub.billingCurrency,
        confidence: Confidence.MEDIUM, // Medium because user might be on PTO or seasonal
        vendorId: sub.vendorId,
        subscriptionId: sub.id,
        evidenceReferences: {
          activeSeats: seatMetrics.activeSeats,
          inactiveSeats: seatMetrics.inactiveSeats,
          activityWindowDays: seatMetrics.activityWindowDays,
          hasActivityData: true,
        },
        assumptions: {
          inactivityThresholdDays: 30,
          notice: "De-provisioning inactive users requires departmental confirmation.",
        },
        modelOrRuleVersion: "rules-activity-v1.0",
      });
    }
  }

  // --- Rule 2: Duplicate & Capability Overlap Subscriptions ---
  const duplicateCandidates = await detectDuplicateAndOverlappingSubscriptions(organizationId);
  for (const cand of duplicateCandidates) {
    if (cand.classification === "CONFIRMED_DUPLICATE" || cand.classification === "LIKELY_DUPLICATE") {
      recommendations.push({
        recommendationType: "DUPLICATE_SUBSCRIPTION",
        title: `Consolidate duplicate subscriptions: ${cand.duplicateSubscription.vendor.name} (${cand.duplicateSubscription.productName})`,
        description: `Two active subscriptions detected for ${cand.primarySubscription.vendor.name} - ${cand.primarySubscription.productName}. Both subscriptions have overlapping billing and access scope.`,
        priority: cand.estimatedMonthlySavings.greaterThan(new Decimal(500))
          ? Priority.HIGH
          : Priority.MEDIUM,
        estimatedSavings: cand.estimatedMonthlySavings,
        savingsCurrency: cand.duplicateSubscription.billingCurrency,
        confidence: cand.classification === "CONFIRMED_DUPLICATE" ? Confidence.HIGH : Confidence.MEDIUM,
        vendorId: cand.duplicateSubscription.vendorId,
        subscriptionId: cand.duplicateSubscription.id,
        evidenceReferences: {
          primarySubscriptionId: cand.primarySubscription.id,
          duplicateSubscriptionId: cand.duplicateSubscription.id,
          signalsMatched: cand.signalsMatched,
          areasOfSimilarity: cand.areasOfSimilarity,
          justifyingDifferences: cand.justifyingDifferences,
        },
        assumptions: {
          savingsBasis: "Canceling the secondary/lower-cost subscription after migrating users",
          verificationSteps: cand.requiredVerificationSteps,
        },
        modelOrRuleVersion: "rules-duplicate-v1.0",
      });
    } else if (cand.classification === "POTENTIAL_OVERLAP") {
      recommendations.push({
        recommendationType: "CAPABILITY_OVERLAP",
        title: `Capability Overlap: ${cand.primarySubscription.productName} and ${cand.duplicateSubscription.productName}`,
        description: `Tools provide overlapping software capabilities in the '${cand.primarySubscription.vendor.category}' category. Review with team leads to evaluate single-vendor standardization.`,
        priority: Priority.LOW,
        estimatedSavings: cand.estimatedMonthlySavings,
        savingsCurrency: cand.duplicateSubscription.billingCurrency,
        confidence: Confidence.LOW,
        vendorId: cand.duplicateSubscription.vendorId,
        subscriptionId: cand.duplicateSubscription.id,
        evidenceReferences: {
          primaryProduct: cand.primarySubscription.productName,
          secondaryProduct: cand.duplicateSubscription.productName,
          category: cand.primarySubscription.vendor.category,
        },
        assumptions: {
          caveat: "Tools may serve different team-specific or governance requirements.",
        },
        modelOrRuleVersion: "rules-overlap-v1.0",
      });
    }
  }

  // --- Rule 3: Upcoming Renewals Review (Within 30 Days) ---
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const upcomingRenewals = await prisma.subscription.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      renewalAt: {
        gte: new Date(),
        lte: thirtyDaysFromNow,
      },
    },
    include: { vendor: true },
  });

  for (const sub of upcomingRenewals) {
    const monthlyAmt = toDecimal(sub.expectedAmount);
    recommendations.push({
      recommendationType: "RENEWAL_REVIEW",
      title: `Contract renewal approaching: ${sub.vendor.name} (${sub.productName})`,
      description: `Subscription renews on ${sub.renewalAt?.toISOString().split("T")[0]}. Review current seat allocations and request volume discount before auto-renewal locks in.`,
      priority: sub.billingInterval === "ANNUAL" ? Priority.HIGH : Priority.MEDIUM,
      estimatedSavings: roundToCents(monthlyAmt.times(new Decimal("0.10"))), // Conservative 10% renegotiation estimate
      savingsCurrency: sub.billingCurrency,
      confidence: Confidence.MEDIUM,
      vendorId: sub.vendorId,
      subscriptionId: sub.id,
      evidenceReferences: {
        renewalDate: sub.renewalAt?.toISOString(),
        contractExpectedAmount: sub.expectedAmount.toString(),
        billingInterval: sub.billingInterval,
      },
      assumptions: {
        benchmarkDiscount: "10% renegotiation or seat right-sizing concession prior to commitment lock",
      },
      modelOrRuleVersion: "rules-renewal-v1.0",
    });
  }

  // --- Rule 4: Invoice Discrepancies ---
  const recon = await runInvoiceReconciliation(organizationId);
  for (const disc of recon.discrepancyList) {
    if (disc.discrepancyType === "UNEXPECTED_PRICE_HIKE" || disc.discrepancyType === "POST_CANCELLATION_CHARGE") {
      recommendations.push({
        recommendationType: "INVOICE_DISCREPANCY",
        title: `Audit invoice billing discrepancy on ${disc.vendorName}`,
        description: disc.explanation,
        priority: Priority.HIGH,
        estimatedSavings: disc.differenceAmount,
        savingsCurrency: "USD",
        confidence: Confidence.HIGH,
        evidenceReferences: {
          invoiceId: disc.invoiceId,
          subscriptionId: disc.subscriptionId,
          discrepancyType: disc.discrepancyType,
          expectedAmount: disc.expectedAmount.toString(),
          observedAmount: disc.observedAmount.toString(),
        },
        assumptions: {
          note: "Requires filing a vendor billing dispute or credits request.",
        },
        modelOrRuleVersion: "rules-reconcile-v1.0",
      });
    }
  }

  // --- Rule 5: AI Spend Budget & Optimization ---
  const aiAnalytics = await getAiSpendAnalytics(organizationId);
  for (const anomaly of aiAnalytics.anomaliesDetected) {
    recommendations.push({
      recommendationType: "AI_SPEND_BUDGET",
      title: `AI Cost Alert: ${anomaly.description}`,
      description: `Unusual consumption pattern detected in AI usage records. Consider prompt caching, rate-limiting developer keys, or model tiering (e.g. flash-tier for high volume workflows).`,
      priority: anomaly.severity === "CRITICAL" ? Priority.CRITICAL : Priority.HIGH,
      estimatedSavings: roundToCents(aiAnalytics.totalReportedCost.times(new Decimal("0.25"))), // 25% potential savings via caching and model tiering
      savingsCurrency: "USD",
      confidence: Confidence.MEDIUM,
      evidenceReferences: {
        anomalyType: anomaly.type,
        currentValue: anomaly.currentValue,
        baselineValue: anomaly.baselineValue,
        totalAiSpend: aiAnalytics.totalReportedCost.toString(),
      },
      assumptions: {
        strategy: "Prompt caching + routing routine requests to cost-optimized model tier",
      },
      modelOrRuleVersion: "rules-ai-v1.0",
    });
  }

  // Persist recommendations into database idempotently
  for (const rec of recommendations) {
    const existing = await prisma.recommendation.findFirst({
      where: {
        organizationId,
        recommendationType: rec.recommendationType,
        title: rec.title,
      },
    });

    if (!existing) {
      await prisma.recommendation.create({
        data: {
          organizationId,
          recommendationType: rec.recommendationType,
          title: rec.title,
          description: rec.description,
          status: RecommendationStatus.NEW,
          priority: rec.priority,
          estimatedSavings: rec.estimatedSavings,
          savingsCurrency: rec.savingsCurrency,
          confidence: rec.confidence,
          vendorId: rec.vendorId,
          subscriptionId: rec.subscriptionId,
          evidenceReferences: rec.evidenceReferences as Prisma.InputJsonValue,
          assumptions: rec.assumptions as Prisma.InputJsonValue,
          modelOrRuleVersion: rec.modelOrRuleVersion,
        },
      });
    }
  }

  return recommendations;
}
