import { z } from "zod";
import prisma from "@/lib/prisma";
import { authenticate } from "@/lib/auth/session";
import { jsonSuccess, handleApiError } from "@/lib/api-response";
import { BillingInterval, SubscriptionStatus, CostType, SourceType } from "@prisma/client";
import { Decimal } from "@/lib/financial/decimal";
import { normalizeRecurringCost } from "@/lib/financial/normalization";
import { createAuditLog } from "@/lib/audit/logger";

const CreateSubscriptionSchema = z.object({
  vendorId: z.string().uuid(),
  productName: z.string().min(1),
  planName: z.string().default("Standard"),
  billingInterval: z.nativeEnum(BillingInterval).default(BillingInterval.MONTHLY),
  billingCurrency: z.string().default("USD"),
  expectedAmount: z.number().nonnegative(),
  billingStartAt: z.string().optional().nullable(),
  renewalAt: z.string().optional().nullable(),
  contractEndAt: z.string().optional().nullable(),
  seatQuantity: z.number().int().nonnegative().optional().nullable(),
  ownerId: z.string().uuid().optional().nullable(),
  status: z.nativeEnum(SubscriptionStatus).default(SubscriptionStatus.ACTIVE),
});

export async function GET(request: Request) {
  try {
    const session = await authenticate(request, "read_financial_reports");
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const vendorId = searchParams.get("vendorId");

    const where: any = {
      organizationId: session.organizationId,
    };

    if (status) {
      where.status = status as SubscriptionStatus;
    }
    if (vendorId) {
      where.vendorId = vendorId;
    }
    if (category) {
      where.vendor = { category: { equals: category, mode: "insensitive" } };
    }
    if (search) {
      where.OR = [
        { productName: { contains: search, mode: "insensitive" } },
        { vendor: { name: { contains: search, mode: "insensitive" } } },
        { planName: { contains: search, mode: "insensitive" } },
      ];
    }

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        vendor: true,
        owner: { select: { id: true, name: true, email: true } },
        _count: {
          select: {
            licenses: true,
            usageRecords: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Augment with normalized monthly cost
    const augmented = subscriptions.map((sub) => {
      const norm = normalizeRecurringCost(sub.expectedAmount, sub.billingInterval);
      return {
        ...sub,
        normalizedMonthlyCost: norm.normalizedMonthlyAmount,
        annualizedCost: norm.annualizedAmount,
        calculationMethod: norm.calculationMethod,
      };
    });

    return jsonSuccess(augmented);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const session = await authenticate(request, "manage_subscriptions");
    const body = await request.json();
    const data = CreateSubscriptionSchema.parse(body);

    const vendor = await prisma.vendor.findFirst({
      where: { id: data.vendorId, organizationId: session.organizationId },
    });

    if (!vendor) {
      throw new Error("Vendor not found or does not belong to organization");
    }

    const expectedAmount = new Decimal(data.expectedAmount);

    const subscription = await prisma.subscription.create({
      data: {
        organizationId: session.organizationId,
        vendorId: data.vendorId,
        productName: data.productName,
        planName: data.planName,
        billingInterval: data.billingInterval,
        billingCurrency: data.billingCurrency.toUpperCase(),
        expectedAmount,
        billingStartAt: data.billingStartAt ? new Date(data.billingStartAt) : new Date(),
        renewalAt: data.renewalAt ? new Date(data.renewalAt) : null,
        contractEndAt: data.contractEndAt ? new Date(data.contractEndAt) : null,
        seatQuantity: data.seatQuantity,
        ownerId: data.ownerId || session.userId,
        status: data.status,
        sourceType: SourceType.MANUAL,
      },
      include: { vendor: true },
    });

    // Create normalized cost record
    const norm = normalizeRecurringCost(expectedAmount, data.billingInterval);
    await prisma.normalizedCostRecord.create({
      data: {
        organizationId: session.organizationId,
        vendorId: vendor.id,
        subscriptionId: subscription.id,
        amount: expectedAmount,
        currency: data.billingCurrency.toUpperCase(),
        normalizedMonthlyAmount: norm.normalizedMonthlyAmount,
        costCategory: vendor.category,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        costType: CostType.ESTIMATED_MONTHLY,
        sourceRecordId: subscription.id,
      },
    });

    await createAuditLog({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "SUBSCRIPTION_CREATED",
      entityType: "Subscription",
      entityId: subscription.id,
      details: {
        productName: subscription.productName,
        planName: subscription.planName,
        expectedAmount: subscription.expectedAmount.toString(),
        billingInterval: subscription.billingInterval,
      },
    });

    return jsonSuccess(
      {
        ...subscription,
        normalizedMonthlyCost: norm.normalizedMonthlyAmount,
        annualizedCost: norm.annualizedAmount,
      },
      undefined,
      201
    );
  } catch (err) {
    return handleApiError(err);
  }
}

