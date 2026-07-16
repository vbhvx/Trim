import { z } from "zod";
import prisma from "@/lib/prisma";
import { authenticate } from "@/lib/auth/session";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/api-response";
import { BillingInterval, SubscriptionStatus } from "@prisma/client";
import { Decimal } from "@/lib/financial/decimal";
import { normalizeRecurringCost } from "@/lib/financial/normalization";
import { calculateSubscriptionSeatUtilization } from "@/lib/analytics/seat-utilization";
import { createAuditLog } from "@/lib/audit/logger";

const UpdateSubscriptionSchema = z.object({
  productName: z.string().min(1).optional(),
  planName: z.string().optional(),
  billingInterval: z.nativeEnum(BillingInterval).optional(),
  expectedAmount: z.number().nonnegative().optional(),
  renewalAt: z.string().optional().nullable(),
  contractEndAt: z.string().optional().nullable(),
  seatQuantity: z.number().int().nonnegative().optional().nullable(),
  ownerId: z.string().uuid().optional().nullable(),
  status: z.nativeEnum(SubscriptionStatus).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authenticate(request, "read_financial_reports");
    const { id } = await params;

    const sub = await prisma.subscription.findFirst({
      where: { id, organizationId: session.organizationId },
      include: {
        vendor: true,
        owner: { select: { id: true, name: true, email: true } },
        licenses: { take: 100 },
        usageRecords: { take: 50, orderBy: { usageStartAt: "desc" } },
        discrepancies: true,
      },
    });

    if (!sub) {
      return jsonError("Subscription not found", 404, "NOT_FOUND");
    }

    const norm = normalizeRecurringCost(sub.expectedAmount, sub.billingInterval);
    const seatMetrics = await calculateSubscriptionSeatUtilization(sub.id);

    return jsonSuccess({
      ...sub,
      normalizedMonthlyCost: norm.normalizedMonthlyAmount,
      annualizedCost: norm.annualizedAmount,
      calculationMethod: norm.calculationMethod,
      assumptions: norm.assumptions,
      seatMetrics,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authenticate(request, "manage_subscriptions");
    const { id } = await params;
    const body = await request.json();
    const data = UpdateSubscriptionSchema.parse(body);

    const existing = await prisma.subscription.findFirst({
      where: { id, organizationId: session.organizationId },
    });

    if (!existing) {
      return jsonError("Subscription not found", 404, "NOT_FOUND");
    }

    const updateData: any = {};
    if (data.productName !== undefined) updateData.productName = data.productName;
    if (data.planName !== undefined) updateData.planName = data.planName;
    if (data.billingInterval !== undefined) updateData.billingInterval = data.billingInterval;
    if (data.expectedAmount !== undefined) updateData.expectedAmount = new Decimal(data.expectedAmount);
    if (data.renewalAt !== undefined) updateData.renewalAt = data.renewalAt ? new Date(data.renewalAt) : null;
    if (data.contractEndAt !== undefined) updateData.contractEndAt = data.contractEndAt ? new Date(data.contractEndAt) : null;
    if (data.seatQuantity !== undefined) updateData.seatQuantity = data.seatQuantity;
    if (data.ownerId !== undefined) updateData.ownerId = data.ownerId;
    if (data.status !== undefined) updateData.status = data.status;

    const updated = await prisma.subscription.update({
      where: { id },
      data: updateData,
      include: { vendor: true },
    });

    await createAuditLog({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "SUBSCRIPTION_UPDATED",
      entityType: "Subscription",
      entityId: id,
      details: updateData,
    });

    return jsonSuccess(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

