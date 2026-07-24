import prisma from "@/lib/prisma";
import { authenticate } from "@/lib/auth/session";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/api-response";
import { generateExplanation } from "@/lib/ai/ai-adapter";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authenticate(request, "read_financial_reports");
    const { id } = await params;

    const rec = await prisma.recommendation.findFirst({
      where: { id, organizationId: session.organizationId },
    });

    if (!rec) {
      return jsonError("Recommendation not found", 404, "NOT_FOUND");
    }

    const explanation = await generateExplanation({
      recommendationType: rec.recommendationType,
      title: rec.title,
      description: rec.description,
      estimatedSavings: `$${rec.estimatedSavings.toString()}/mo`,
      evidence: (rec.evidenceReferences as Record<string, unknown>) || {},
      assumptions: (rec.assumptions as Record<string, unknown>) || {},
    });

    return jsonSuccess(explanation);
  } catch (err) {
    return handleApiError(err);
  }
}

