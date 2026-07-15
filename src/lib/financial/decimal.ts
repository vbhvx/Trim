import Decimal from "decimal.js";

// Configure Decimal for financial precision
Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -14,
  toExpPos: 28,
});

export { Decimal };

export function toDecimal(val: Decimal.Value | null | undefined): Decimal {
  if (val === null || val === undefined || val === "") {
    return new Decimal(0);
  }
  return new Decimal(val);
}

export function formatMoney(
  amount: Decimal.Value,
  currency: string = "USD",
  decimals: number = 2
): string {
  const d = toDecimal(amount);
  const formatted = d.toFixed(decimals);
  // Add comma separators
  const parts = formatted.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const numStr = parts.join(".");

  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CAD: "CA$",
    AUD: "A$",
  };

  const symbol = symbols[currency.toUpperCase()] || `${currency} `;
  return `${symbol}${numStr}`;
}

export function roundToCents(amount: Decimal.Value): Decimal {
  return toDecimal(amount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

