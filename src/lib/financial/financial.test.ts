import { describe, it, expect } from "vitest";
import { Decimal, formatMoney, roundToCents } from "./decimal";
import {
  normalizeRecurringCost,
  calculateUsageCost,
  calculateSeatSavings,
} from "./normalization";
import { convertCurrency, DEFAULT_RATES } from "./currency";

describe("Financial Precision & Normalization", () => {
  it("prevents binary floating-point rounding errors (0.1 + 0.2)", () => {
    // In IEEE-754: 0.1 + 0.2 === 0.30000000000000004
    const a = new Decimal("0.1");
    const b = new Decimal("0.2");
    const sum = a.plus(b);
    expect(sum.toString()).toBe("0.3");
    expect(sum.equals(new Decimal("0.3"))).toBe(true);
  });

  it("normalizes monthly subscription correctly", () => {
    const res = normalizeRecurringCost(120, "MONTHLY");
    expect(res.normalizedMonthlyAmount.toString()).toBe("120");
    expect(res.annualizedAmount.toString()).toBe("1440");
  });

  it("normalizes annual subscription correctly with decimal rounding", () => {
    // $1,200 annual -> $100/mo
    const res = normalizeRecurringCost(1200, "ANNUAL");
    expect(res.normalizedMonthlyAmount.toString()).toBe("100");
    expect(res.annualizedAmount.toString()).toBe("1200");

    // $1,000 annual -> $83.33/mo
    const res2 = normalizeRecurringCost(1000, "ANNUAL");
    expect(res2.normalizedMonthlyAmount.toString()).toBe("83.33");
  });

  it("normalizes quarterly subscription correctly", () => {
    // $300 quarterly -> $100/mo, $1200 annualized
    const res = normalizeRecurringCost(300, "QUARTERLY");
    expect(res.normalizedMonthlyAmount.toString()).toBe("100");
    expect(res.annualizedAmount.toString()).toBe("1200");
  });

  it("calculates usage-based costs including base fee and overage", () => {
    const res = calculateUsageCost({
      baseFee: 50,
      quantity: 1500,
      includedQuota: 1000,
      unitRate: 0.1,
      overageRate: 0.1,
    });

    // 50 base + (1500 - 1000) * 0.1 = 50 + 50 = 100
    expect(res.billableQuantity.toString()).toBe("500");
    expect(res.usageCharge.toString()).toBe("50");
    expect(res.totalCost.toString()).toBe("100");
  });

  it("calculates seat savings respecting minimum contract commitments", () => {
    // 5 unassigned seats, $40/seat/month, but commitment is 18 out of 20 current seats (max 2 removable)
    const res = calculateSeatSavings(5, 40, 18, 20);
    expect(res.eligibleRemovableSeats).toBe(2);
    expect(res.potentialMonthlySavings.toString()).toBe("80");
    expect(res.potentialAnnualSavings.toString()).toBe("960");
    expect(res.bindingCommitmentNote).toContain("Contractual minimum commitment of 18 seats");
  });

  it("converts currency with explicit benchmark rate and preserves precision", async () => {
    // Convert 100 EUR to USD with default benchmark rate (1.0850)
    const res = await convertCurrency(100, "EUR", "USD");
    expect(res.isConverted).toBe(true);
    expect(res.rateUsed.toString()).toBe("1.085");
    expect(res.convertedAmount.toString()).toBe("108.5");
  });

  it("formats money accurately across multiple currencies", () => {
    expect(formatMoney(12345.67, "USD")).toBe("$12,345.67");
    expect(formatMoney(890.5, "EUR")).toBe("€890.50");
    expect(formatMoney(500000, "JPY", 0)).toBe("¥500,000");
  });
});

