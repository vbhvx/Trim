import { z } from "zod";
import prisma from "@/lib/prisma";
import { authenticate } from "@/lib/auth/session";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/api-response";
import { RecommendationStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/audit/logger";

const ImplementSchema = z.object({
  actionTaken: z.string().min(3, "Action taken details are required"),
  notes: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authenticate(request, "implement_recommendations");
    const { id } = await params;
    const body = await request.json();
    const data = ImplementSchema.parse(body);

    const rec = await prisma.recommendation.findFirst({
      where: { id, organizationId: session.organizationId },
    });

    if (!rec) {
      return jsonError("Recommendation not found", 404, "NOT_FOUND");
    }

    const updated = await prisma.recommendation.update({
      where: { id },
      data: {
        status: RecommendationStatus.IMPLEMENTED,
        reviewNotes: data.notes || data.actionTaken,
      },
    });

    await createAuditLog({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "RECOMMENDATION_IMPLEMENTED",
      entityType: "Recommendation",
      entityId: id,
      details: {
        title: rec.title,
        actionTaken: data.actionTaken,
        notes: data.notes,
      },
    });

    return jsonSuccess({
      message: "Recommendation marked as implemented. Awaiting post-implementation savings verification.",
      recommendation: updated,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

