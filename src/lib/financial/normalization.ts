import { Decimal, toDecimal, roundToCents } from "./decimal";
import { BillingInterval } from "@prisma/client";

export interface MonthlyNormalizationResult {
  rawAmount: Decimal;
  billingInterval: BillingInterval | string;
  normalizedMonthlyAmount: Decimal;
  annualizedAmount: Decimal;
  calculationMethod: string;
  assumptions: string[];
}

export function normalizeRecurringCost(
  rawAmount: Decimal.Value,
  billingInterval: BillingInterval | string
): MonthlyNormalizationResult {
  const amount = toDecimal(rawAmount);

  switch (billingInterval) {
    case BillingInterval.MONTHLY:
    case "MONTHLY":
    case "monthly": {
      const normalizedMonthly = amount;
      const annualized = amount.times(12);
      return {
        rawAmount: amount,
        billingInterval: "MONTHLY",
        normalizedMonthlyAmount: roundToCents(normalizedMonthly),
        annualizedAmount: roundToCents(annualized),
        calculationMethod: "Direct monthly recurring rate",
        assumptions: [
          "Billed once per calendar month",
          "No mid-month proration or seasonal changes assumed",
        ],
      };
    }

    case BillingInterval.ANNUAL:
    case "ANNUAL":
    case "annual": {
      const normalizedMonthly = amount.dividedBy(12);
      const annualized = amount;
      return {
        rawAmount: amount,
        billingInterval: "ANNUAL",
        normalizedMonthlyAmount: roundToCents(normalizedMonthly),
        annualizedAmount: roundToCents(annualized),
        calculationMethod: "Annual contract divided by 12 calendar months",
        assumptions: [
          "Upfront annual commitment amortized evenly across 12 months",
          "Cash-flow outlay occurs once per renewal cycle",
        ],
      };
    }

    case BillingInterval.QUARTERLY:
    case "QUARTERLY":
    case "quarterly": {
      const normalizedMonthly = amount.dividedBy(3);
      const annualized = amount.times(4);
      return {
        rawAmount: amount,
        billingInterval: "QUARTERLY",
        normalizedMonthlyAmount: roundToCents(normalizedMonthly),
        annualizedAmount: roundToCents(annualized),
        calculationMethod: "Quarterly fee divided by 3 calendar months",
        assumptions: [
          "Billed every 3 calendar months",
          "Even amortization across billing quarter",
        ],
      };
    }

    case BillingInterval.USAGE_BASED:
    case "USAGE_BASED":
    case "usage_based": {
      // For usage-based, rawAmount is the recent 30-day bill or estimated baseline
      const normalizedMonthly = amount;
      const annualized = amount.times(12);
      return {
        rawAmount: amount,
        billingInterval: "USAGE_BASED",
        normalizedMonthlyAmount: roundToCents(normalizedMonthly),
        annualizedAmount: roundToCents(annualized),
        calculationMethod: "Trailing 30-day usage run-rate",
        assumptions: [
          "Variable usage consumption assumes trailing 30-day velocity",
          "Does not guarantee future invoice amounts if usage spikes or drops",
        ],
      };
    }

    case BillingInterval.CUSTOM:
    case "CUSTOM":
    default: {
      const normalizedMonthly = amount;
      const annualized = amount.times(12);
      return {
        rawAmount: amount,
        billingInterval: "CUSTOM",
        normalizedMonthlyAmount: roundToCents(normalizedMonthly),
        annualizedAmount: roundToCents(annualized),
        calculationMethod: "Default monthly equivalent assumption",
        assumptions: [
          "Custom contract terms: treated as monthly run-rate pending detailed contract breakdown",
        ],
      };
    }
  }
}

export interface UsageCalculationParams {
  baseFee: Decimal.Value;
  quantity: Decimal.Value;
  includedQuota?: Decimal.Value;
  unitRate: Decimal.Value;
  overageRate?: Decimal.Value;
}

export interface UsageCalculationResult {
  baseFee: Decimal;
  quantity: Decimal;
  includedQuota: Decimal;
  billableQuantity: Decimal;
  usageCharge: Decimal;
  totalCost: Decimal;
  assumptions: string[];
}

export function calculateUsageCost(
  params: UsageCalculationParams
): UsageCalculationResult {
  const base = toDecimal(params.baseFee);
  const qty = toDecimal(params.quantity);
  const quota = toDecimal(params.includedQuota ?? 0);
  const rate = toDecimal(params.unitRate);
  const overageRate = params.overageRate !== undefined ? toDecimal(params.overageRate) : rate;

  let billableQty = new Decimal(0);
  let usageCharge = new Decimal(0);

  if (qty.greaterThan(quota)) {
    billableQty = qty.minus(quota);
    usageCharge = billableQty.times(overageRate);
  }

  const totalCost = base.plus(usageCharge);

  return {
    baseFee: roundToCents(base),
    quantity: qty,
    includedQuota: quota,
    billableQuantity: billableQty,
    usageCharge: roundToCents(usageCharge),
    totalCost: roundToCents(totalCost),
    assumptions: [
      `Base subscription fee: $${base.toFixed(2)}`,
      `Included quota: ${quota.toString()} units`,
      `Overage rate: $${overageRate.toFixed(4)} per unit`,
    ],
  };
}

export function calculateSeatSavings(
  removableSeats: number,
  seatPricePerMonth: Decimal.Value,
  minimumCommitmentSeats?: number,
  currentPurchasedSeats?: number
): {
  eligibleRemovableSeats: number;
  potentialMonthlySavings: Decimal;
  potentialAnnualSavings: Decimal;
  bindingCommitmentNote: string | null;
} {
  const price = toDecimal(seatPricePerMonth);
  let eligible = Math.max(0, removableSeats);
  let note: string | null = null;

  if (minimumCommitmentSeats !== undefined && currentPurchasedSeats !== undefined) {
    const maxReduction = Math.max(0, currentPurchasedSeats - minimumCommitmentSeats);
    if (eligible > maxReduction) {
      eligible = maxReduction;
      note = `Contractual minimum commitment of ${minimumCommitmentSeats} seats limits reduction to ${eligible} seat(s).`;
    }
  }

  const monthlySavings = price.times(eligible);
  const annualSavings = monthlySavings.times(12);

  return {
    eligibleRemovableSeats: eligible,
    potentialMonthlySavings: roundToCents(monthlySavings),
    potentialAnnualSavings: roundToCents(annualSavings),
    bindingCommitmentNote: note,
  };
}

