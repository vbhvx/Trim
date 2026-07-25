import { authenticate } from "@/lib/auth/session";
import { jsonSuccess, handleApiError } from "@/lib/api-response";
import { runOptimizationRules } from "@/lib/recommendations/rule-engine";
import { createAuditLog } from "@/lib/audit/logger";

export async function POST(request: Request) {
  try {
    const session = await authenticate(request, "run_cost_analysis");

    const recommendations = await runOptimizationRules(session.organizationId);

    await createAuditLog({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "OPTIMIZATION_ANALYSIS_EXECUTED",
      entityType: "RecommendationEngine",
      entityId: session.organizationId,
      details: {
        recommendationsGenerated: recommendations.length,
        types: recommendations.map((r) => r.recommendationType),
      },
    });

    return jsonSuccess({
      message: `Analysis completed. Generated ${recommendations.length} optimization recommendation(s).`,
      recommendationsCount: recommendations.length,
      recommendations,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

