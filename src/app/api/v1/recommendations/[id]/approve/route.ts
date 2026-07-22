import { z } from "zod";
import prisma from "@/lib/prisma";
import { authenticate } from "@/lib/auth/session";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/api-response";
import { RecommendationStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/audit/logger";

const ApproveSchema = z.object({
  reviewNotes: z.string().optional(),
  assignedToId: z.string().uuid().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authenticate(request, "approve_recommendations");
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const data = ApproveSchema.parse(body);

    const rec = await prisma.recommendation.findFirst({
      where: { id, organizationId: session.organizationId },
    });

    if (!rec) {
      return jsonError("Recommendation not found", 404, "NOT_FOUND");
    }

    const updated = await prisma.recommendation.update({
      where: { id },
      data: {
        status: RecommendationStatus.APPROVED,
        reviewNotes: data.reviewNotes || rec.reviewNotes,
        assignedToId: data.assignedToId || rec.assignedToId || session.userId,
      },
    });

    await createAuditLog({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "RECOMMENDATION_APPROVED",
      entityType: "Recommendation",
      entityId: id,
      details: {
        title: rec.title,
        estimatedSavings: rec.estimatedSavings.toString(),
        notes: data.reviewNotes,
      },
    });

    return jsonSuccess({
      message: "Recommendation successfully approved for implementation",
      recommendation: updated,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

