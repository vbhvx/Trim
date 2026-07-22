import { z } from "zod";
import prisma from "@/lib/prisma";
import { authenticate } from "@/lib/auth/session";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/api-response";
import { RecommendationStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/audit/logger";

const RejectSchema = z.object({
  rejectionReason: z.string().min(3, "Rejection reason is required"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authenticate(request, "reject_recommendations");
    const { id } = await params;
    const body = await request.json();
    const data = RejectSchema.parse(body);

    const rec = await prisma.recommendation.findFirst({
      where: { id, organizationId: session.organizationId },
    });

    if (!rec) {
      return jsonError("Recommendation not found", 404, "NOT_FOUND");
    }

    const updated = await prisma.recommendation.update({
      where: { id },
      data: {
        status: RecommendationStatus.REJECTED,
        reviewNotes: data.rejectionReason,
      },
    });

    await createAuditLog({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "RECOMMENDATION_REJECTED",
      entityType: "Recommendation",
      entityId: id,
      details: {
        title: rec.title,
        reason: data.rejectionReason,
      },
    });

    return jsonSuccess({
      message: "Recommendation rejected",
      recommendation: updated,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

