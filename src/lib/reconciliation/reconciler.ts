import { Decimal, roundToCents, toDecimal } from "../financial/decimal";
import { DiscrepancyStatus, SubscriptionStatus } from "@prisma/client";
import prisma from "../prisma";

export interface ReconciliationResult {
  invoicesAnalyzed: number;
  discrepanciesFound: number;
  discrepancyList: Array<{
    invoiceId: string;
    subscriptionId?: string;
    vendorName: string;
    discrepancyType: string;
    expectedAmount: Decimal;
    observedAmount: Decimal;
    differenceAmount: Decimal;
    explanation: string;
  }>;
}

export async function runInvoiceReconciliation(
  organizationId: string
): Promise<ReconciliationResult> {
  const invoices = await prisma.invoice.findMany({
    where: { organizationId },
    include: {
      vendor: true,
      lineItems: true,
    },
  });

  const subscriptions = await prisma.subscription.findMany({
    where: { organizationId },
    include: { vendor: true },
  });

  const discrepancies: ReconciliationResult["discrepancyList"] = [];

  for (const invoice of invoices) {
    const observedTotal = toDecimal(invoice.total);

    // Rule 1: Check line items sum vs invoice total
    if (invoice.lineItems.length > 0) {
      let lineItemsSum = new Decimal(0);
      for (const line of invoice.lineItems) {
        lineItemsSum = lineItemsSum.plus(toDecimal(line.amount));
      }
      lineItemsSum = lineItemsSum.plus(toDecimal(invoice.tax));

      const diff = observedTotal.minus(lineItemsSum).abs();
      if (diff.greaterThan(new Decimal("0.05"))) {
        discrepancies.push({
          invoiceId: invoice.id,
          vendorName: invoice.vendor.name,
          discrepancyType: "LINE_ITEM_SUM_MISMATCH",
          expectedAmount: roundToCents(lineItemsSum),
          observedAmount: roundToCents(observedTotal),
          differenceAmount: roundToCents(diff),
          explanation: `Invoice total ($${observedTotal.toFixed(2)}) disagrees with sum of line items + tax ($${lineItemsSum.toFixed(2)}) by $${diff.toFixed(2)}.`,
        });
      }
    }

    // Rule 2: Match invoice to active subscription
    const matchedSub = subscriptions.find(
      (s) => s.vendorId === invoice.vendorId
    );

    if (!matchedSub) {
      discrepancies.push({
        invoiceId: invoice.id,
        vendorName: invoice.vendor.name,
        discrepancyType: "UNMATCHED_SUBSCRIPTION",
        expectedAmount: new Decimal(0),
        observedAmount: roundToCents(observedTotal),
        differenceAmount: roundToCents(observedTotal),
        explanation: `Invoice from vendor '${invoice.vendor.name}' has no registered subscription in the inventory.`,
      });
      continue;
    }

    // Rule 3: Check if subscription was cancelled or expired
    if (
      matchedSub.status === SubscriptionStatus.CANCELLED ||
      matchedSub.status === SubscriptionStatus.EXPIRED
    ) {
      discrepancies.push({
        invoiceId: invoice.id,
        subscriptionId: matchedSub.id,
        vendorName: invoice.vendor.name,
        discrepancyType: "POST_CANCELLATION_CHARGE",
        expectedAmount: new Decimal(0),
        observedAmount: roundToCents(observedTotal),
        differenceAmount: roundToCents(observedTotal),
        explanation: `Invoice received for '${matchedSub.productName}' which is currently marked as ${matchedSub.status}.`,
      });
      continue;
    }

    // Rule 4: Compare invoice total against expected plan amount
    const expected = toDecimal(matchedSub.expectedAmount);
    if (expected.greaterThan(0)) {
      const diff = observedTotal.minus(expected);
      // If invoice is higher than expected amount by more than 5% or $10
      if (diff.greaterThan(new Decimal("10")) && diff.dividedBy(expected).greaterThan(new Decimal("0.05"))) {
        discrepancies.push({
          invoiceId: invoice.id,
          subscriptionId: matchedSub.id,
          vendorName: invoice.vendor.name,
          discrepancyType: "UNEXPECTED_PRICE_HIKE",
          expectedAmount: roundToCents(expected),
          observedAmount: roundToCents(observedTotal),
          differenceAmount: roundToCents(diff),
          explanation: `Invoice charge ($${observedTotal.toFixed(2)}) is higher than contractual expected rate ($${expected.toFixed(2)}) by $${diff.toFixed(2)} (+${diff.dividedBy(expected).times(100).toFixed(1)}%).`,
        });
      }
    }
  }

  // Persist detected discrepancies idempotently
  for (const disc of discrepancies) {
    const existing = await prisma.reconciliationDiscrepancy.findFirst({
      where: {
        organizationId,
        invoiceId: disc.invoiceId,
        discrepancyType: disc.discrepancyType,
      },
    });

    if (!existing) {
      await prisma.reconciliationDiscrepancy.create({
        data: {
          organizationId,
          invoiceId: disc.invoiceId,
          subscriptionId: disc.subscriptionId || null,
          vendorName: disc.vendorName,
          discrepancyType: disc.discrepancyType,
          expectedAmount: disc.expectedAmount,
          observedAmount: disc.observedAmount,
          differenceAmount: disc.differenceAmount,
          currency: "USD",
          status: DiscrepancyStatus.DETECTED,
          notes: disc.explanation,
        },
      });
    }
  }

  return {
    invoicesAnalyzed: invoices.length,
    discrepanciesFound: discrepancies.length,
    discrepancyList: discrepancies,
  };
}

