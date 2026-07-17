import Papa from "papaparse";
import { z } from "zod";
import { Decimal } from "../financial/decimal";

export interface ParsedCsvRow {
  rowNumber: number;
  raw: Record<string, string>;
  isValid: boolean;
  errors: string[];
  normalizedData?: Record<string, unknown>;
}

export interface ParseResult {
  totalRows: number;
  validRows: ParsedCsvRow[];
  invalidRows: ParsedCsvRow[];
}

// Schemas for CSV row validation
export const SubscriptionCsvRowSchema = z.object({
  vendorName: z.string().min(1, "Vendor name is required"),
  productName: z.string().min(1, "Product name is required"),
  planName: z.string().default("Standard"),
  billingInterval: z.enum(["MONTHLY", "ANNUAL", "QUARTERLY", "USAGE_BASED", "CUSTOM"]).default("MONTHLY"),
  billingCurrency: z.string().default("USD"),
  expectedAmount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, "Invalid amount"),
  renewalDate: z.string().optional().nullable(),
  contractEndDate: z.string().optional().nullable(),
  seatQuantity: z.string().optional().nullable(),
  ownerEmail: z.string().email().optional().or(z.literal("")).nullable(),
  externalSubscriptionId: z.string().optional().nullable(),
});

export const InvoiceCsvRowSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  vendorName: z.string().min(1, "Vendor name is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  billingPeriodStart: z.string().optional().nullable(),
  billingPeriodEnd: z.string().optional().nullable(),
  currency: z.string().default("USD"),
  subtotal: z.string().optional().nullable(),
  tax: z.string().default("0"),
  total: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, "Invalid total amount"),
  status: z.enum(["PAID", "PENDING", "OVERDUE", "VOID", "DISPUTED"]).default("PAID"),
  description: z.string().optional().default("SaaS Subscription Fee"),
});

export const UsageCsvRowSchema = z.object({
  vendorName: z.string().min(1, "Vendor name is required"),
  metricName: z.string().min(1, "Metric name is required"),
  quantity: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, "Invalid quantity"),
  unit: z.string().min(1, "Unit is required"),
  usageStartAt: z.string().min(1, "Usage start date is required"),
  usageEndAt: z.string().min(1, "Usage end date is required"),
  reportedCost: z.string().optional().nullable(),
  modelIdentifier: z.string().optional().nullable(),
  projectIdentifier: z.string().optional().nullable(),
});

export const LicenseCsvRowSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  externalIdentity: z.string().min(1, "External identity or email is required"),
  seatStatus: z.enum(["ASSIGNED", "UNASSIGNED", "SUSPENDED", "UNKNOWN"]).default("ASSIGNED"),
  assignedAt: z.string().optional().nullable(),
  lastActivityAt: z.string().optional().nullable(),
});

export function parseCsvText(csvText: string): Record<string, string>[] {
  const parseResult = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) =>
      header
        .trim()
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]/g, "")
        .replace(/^vendor$/, "vendorname")
        .replace(/^product$/, "productname")
        .replace(/^plan$/, "planname")
        .replace(/^amount$/, "expectedamount")
        .replace(/^cost$/, "expectedamount")
        .replace(/^renewal$/, "renewaldate")
        .replace(/^seats$/, "seatquantity")
        .replace(/^owner$/, "owneremail")
        .replace(/^invoiceno$/, "invoicenumber")
        .replace(/^totalamount$/, "total"),
  });

  return parseResult.data as Record<string, string>[];
}

