import { SeatStatus } from "@prisma/client";
import { Decimal, roundToCents, toDecimal } from "../financial/decimal";
import prisma from "../prisma";

export interface SeatUtilizationMetrics {
  subscriptionId: string;
  productName: string;
  vendorName: string;
  billingInterval: string;
  seatPricePerMonth: Decimal;
  purchasedSeats: number;
  assignedSeats: number;
  unassignedSeats: number;
  activeSeats: number;
  inactiveSeats: number;
  unknownActivitySeats: number;
  assignmentRatePct: number;
  activityRatePct: number | null; // null if no activity data exists
  hasActivityData: boolean;
  activityWindowDays: number;
  potentialRemovableSeats: number;
  potentialMonthlySavings: Decimal;
  potentialAnnualSavings: Decimal;
  contractualCommitmentNote: string | null;
  dataQualityNotes: string[];
}

export async function calculateSubscriptionSeatUtilization(
  subscriptionId: string,
  activityWindowDays = 30
): Promise<SeatUtilizationMetrics | null> {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      vendor: true,
      licenses: true,
    },
  });

  if (!sub) return null;

  const purchasedSeats = sub.seatQuantity ?? sub.licenses.length ?? 0;
  const licenses = sub.licenses;
  const now = new Date();
  const activityCutoff = new Date(now.getTime() - activityWindowDays * 24 * 60 * 60 * 1000);

  let assignedCount = 0;
  let unassignedCount = 0;
  let activeCount = 0;
  let inactiveCount = 0;
  let unknownActivityCount = 0;
  let hasAnyActivityTimestamp = false;

  for (const lic of licenses) {
    if (lic.seatStatus === SeatStatus.ASSIGNED) {
      assignedCount++;

      if (lic.lastActivityAt) {
        hasAnyActivityTimestamp = true;
        if (lic.lastActivityAt >= activityCutoff) {
          activeCount++;
        } else {
          inactiveCount++;
        }
      } else {
        // Critical spec rule: Do not equate a missing activity timestamp with an unused license!
        unknownActivityCount++;
      }
    } else if (lic.seatStatus === SeatStatus.UNASSIGNED) {
      unassignedCount++;
    } else if (lic.seatStatus === SeatStatus.UNKNOWN) {
      unknownActivityCount++;
    }
  }

  // Calculate unassigned based on purchased vs assigned
  if (purchasedSeats > assignedCount) {
    unassignedCount = Math.max(unassignedCount, purchasedSeats - assignedCount);
  }

  // Derive seat price per month
  let seatPrice = new Decimal(0);
  if (purchasedSeats > 0 && sub.expectedAmount) {
    const rawExpected = toDecimal(sub.expectedAmount);
    if (sub.billingInterval === "ANNUAL") {
      seatPrice = rawExpected.dividedBy(12).dividedBy(purchasedSeats);
    } else if (sub.billingInterval === "QUARTERLY") {
      seatPrice = rawExpected.dividedBy(3).dividedBy(purchasedSeats);
    } else {
      seatPrice = rawExpected.dividedBy(purchasedSeats);
    }
  }

  // Assignment Rate: (assigned / purchased) * 100
  const assignmentRatePct =
    purchasedSeats > 0
      ? Number(new Decimal(assignedCount).dividedBy(purchasedSeats).times(100).toFixed(1))
      : 0;

  // Activity Rate: only calculable if activity data is exposed by vendor
  let activityRatePct: number | null = null;
  if (hasAnyActivityTimestamp && purchasedSeats > 0) {
    activityRatePct = Number(
      new Decimal(activeCount).dividedBy(purchasedSeats).times(100).toFixed(1)
    );
  }

  // Removable seats calculation: unassigned seats + verified inactive seats (if activity data exists)
  // We do NOT count unknown activity seats as removable!
  const potentialRemovableSeats = unassignedCount + (hasAnyActivityTimestamp ? inactiveCount : 0);
  const potentialMonthlySavings = roundToCents(seatPrice.times(potentialRemovableSeats));
  const potentialAnnualSavings = roundToCents(potentialMonthlySavings.times(12));

  let contractualCommitmentNote: string | null = null;
  if (sub.billingInterval === "ANNUAL") {
    contractualCommitmentNote =
      "Annual contract active. Removing seats will only reduce invoice upon next contract renewal date.";
  }

  const dataQualityNotes: string[] = [];
  if (!hasAnyActivityTimestamp && licenses.length > 0) {
    dataQualityNotes.push(
      "Vendor does not provide seat activity timestamps. License inactivity cannot be determined without activity signals."
    );
  }
  if (sub.seatQuantity === null) {
    dataQualityNotes.push(
      "Purchased seat count is not explicitly set in subscription contract metadata."
    );
  }

  return {
    subscriptionId: sub.id,
    productName: sub.productName,
    vendorName: sub.vendor.name,
    billingInterval: sub.billingInterval,
    seatPricePerMonth: roundToCents(seatPrice),
    purchasedSeats,
    assignedSeats: assignedCount,
    unassignedSeats: unassignedCount,
    activeSeats: activeCount,
    inactiveSeats: inactiveCount,
    unknownActivitySeats: unknownActivityCount,
    assignmentRatePct,
    activityRatePct,
    hasActivityData: hasAnyActivityTimestamp,
    activityWindowDays,
    potentialRemovableSeats,
    potentialMonthlySavings,
    potentialAnnualSavings,
    contractualCommitmentNote,
    dataQualityNotes,
  };
}

