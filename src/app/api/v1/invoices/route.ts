import { z } from "zod";
import prisma from "@/lib/prisma";
import { authenticate } from "@/lib/auth/session";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/api-response";
import { InvoiceStatus, SourceType, CostType } from "@prisma/client";
import { Decimal } from "@/lib/financial/decimal";
import { createAuditLog } from "@/lib/audit/logger";

const CreateInvoiceSchema = z.object({
  vendorId: z.string().uuid(),
  invoiceNumber: z.string().min(1),
  currency: z.string().default("USD"),
  subtotal: z.number().nonnegative(),
  tax: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
  invoiceDate: z.string(),
  billingPeriodStart: z.string().optional().nullable(),
  billingPeriodEnd: z.string().optional().nullable(),
  status: z.nativeEnum(InvoiceStatus).default(InvoiceStatus.PAID),
  lineItems: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number().optional(),
        unitPrice: z.number().optional(),
        amount: z.number().nonnegative(),
        subscriptionId: z.string().uuid().optional().nullable(),
      })
    )
    .optional(),
});

export async function GET(request: Request) {
  try {
    const session = await authenticate(request, "view_invoices_contracts");
    const { searchParams } = new URL(request.url);

    const vendorId = searchParams.get("vendorId");
    const status = searchParams.get("status");

    const where: any = { organizationId: session.organizationId };
    if (vendorId) where.vendorId = vendorId;
    if (status) where.status = status as InvoiceStatus;

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        vendor: true,
        lineItems: true,
        discrepancies: true,
      },
      orderBy: { invoiceDate: "desc" },
    });

    return jsonSuccess(invoices);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const session = await authenticate(request, "import_financial_records");
    const body = await request.json();
    const data = CreateInvoiceSchema.parse(body);

    const vendor = await prisma.vendor.findFirst({
      where: { id: data.vendorId, organizationId: session.organizationId },
    });

    if (!vendor) {
      return jsonError("Vendor not found", 404, "NOT_FOUND");
    }

    // Check duplicate invoice
    const existing = await prisma.invoice.findFirst({
      where: {
        organizationId: session.organizationId,
        vendorId: data.vendorId,
        invoiceNumber: data.invoiceNumber,
      },
    });

    if (existing) {
      return jsonError(
        `Invoice #${data.invoiceNumber} from vendor '${vendor.name}' already exists`,
        409,
        "DUPLICATE_INVOICE"
      );
    }

    const subtotal = new Decimal(data.subtotal);
    const tax = new Decimal(data.tax);
    const total = new Decimal(data.total);

    const invoice = await prisma.invoice.create({
      data: {
        organizationId: session.organizationId,
        vendorId: data.vendorId,
        invoiceNumber: data.invoiceNumber,
        currency: data.currency.toUpperCase(),
        subtotal,
        tax,
        total,
        invoiceDate: new Date(data.invoiceDate),
        billingPeriodStart: data.billingPeriodStart ? new Date(data.billingPeriodStart) : null,
        billingPeriodEnd: data.billingPeriodEnd ? new Date(data.billingPeriodEnd) : null,
        status: data.status,
        sourceType: SourceType.MANUAL,
        lineItems: data.lineItems
          ? {
              create: data.lineItems.map((li) => ({
                description: li.description,
                quantity: li.quantity ? new Decimal(li.quantity) : null,
                unitPrice: li.unitPrice ? new Decimal(li.unitPrice) : null,
                amount: new Decimal(li.amount),
                currency: data.currency.toUpperCase(),
                subscriptionId: li.subscriptionId || null,
              })),
            }
          : undefined,
      },
      include: { lineItems: true, vendor: true },
    });

    // Record normalized cost entry
    await prisma.normalizedCostRecord.create({
      data: {
        organizationId: session.organizationId,
        vendorId: vendor.id,
        invoiceId: invoice.id,
        amount: total,
        currency: data.currency.toUpperCase(),
        normalizedMonthlyAmount: total,
        costCategory: vendor.category,
        periodStart: invoice.billingPeriodStart || invoice.invoiceDate,
        periodEnd: invoice.billingPeriodEnd || invoice.invoiceDate,
        costType: CostType.ACTUAL_INVOICE,
        sourceRecordId: invoice.id,
      },
    });

    await createAuditLog({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "INVOICE_CREATED",
      entityType: "Invoice",
      entityId: invoice.id,
      details: {
        invoiceNumber: invoice.invoiceNumber,
        vendorName: vendor.name,
        total: total.toString(),
      },
    });

    return jsonSuccess(invoice, undefined, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

