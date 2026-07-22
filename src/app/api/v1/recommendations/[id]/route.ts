import { z } from "zod";
import prisma from "@/lib/prisma";
import { authenticate } from "@/lib/auth/session";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/api-response";
import { RecommendationStatus, Priority } from "@prisma/client";

const UpdateRecommendationSchema = z.object({
  status: z.nativeEnum(RecommendationStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  assignedToId: z.string().uuid().optional().nullable(),
  reviewNotes: z.string().optional().nullable(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authenticate(request, "read_financial_reports");
    const { id } = await params;

    const recommendation = await prisma.recommendation.findFirst({
      where: { id, organizationId: session.organizationId },
      include: {
        outcomes: {
          include: {
            verifiedBy: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!recommendation) {
      return jsonError("Recommendation not found", 404, "NOT_FOUND");
    }

    return jsonSuccess(recommendation);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authenticate(request, "approve_recommendations");
    const { id } = await params;
    const body = await request.json();
    const data = UpdateRecommendationSchema.parse(body);

    const existing = await prisma.recommendation.findFirst({
      where: { id, organizationId: session.organizationId },
    });

    if (!existing) {
      return jsonError("Recommendation not found", 404, "NOT_FOUND");
    }

    const updated = await prisma.recommendation.update({
      where: { id },
      data,
    });

    return jsonSuccess(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

