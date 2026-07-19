import { z } from "zod";
import prisma from "@/lib/prisma";
import { authenticate } from "@/lib/auth/session";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/api-response";
import { DiscrepancyStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/audit/logger";

const UpdateDiscrepancySchema = z.object({
  status: z.nativeEnum(DiscrepancyStatus),
  notes: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authenticate(request, "manage_subscriptions");
    const { id } = await params;
    const body = await request.json();
    const data = UpdateDiscrepancySchema.parse(body);

    const existing = await prisma.reconciliationDiscrepancy.findFirst({
      where: { id, organizationId: session.organizationId },
    });

    if (!existing) {
      return jsonError("Discrepancy record not found", 404, "NOT_FOUND");
    }

    const updated = await prisma.reconciliationDiscrepancy.update({
      where: { id },
      data: {
        status: data.status,
        notes: data.notes ?? existing.notes,
        resolvedAt: data.status === "RESOLVED" || data.status === "DISMISSED" ? new Date() : null,
        resolvedById: data.status === "RESOLVED" || data.status === "DISMISSED" ? session.userId : null,
      },
    });

    await createAuditLog({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "DISCREPANCY_STATUS_UPDATED",
      entityType: "ReconciliationDiscrepancy",
      entityId: id,
      details: { status: data.status, notes: data.notes },
    });

    return jsonSuccess(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

