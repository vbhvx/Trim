import { authenticate } from "@/lib/auth/session";
import { jsonSuccess, handleApiError } from "@/lib/api-response";
import { getAiSpendAnalytics } from "@/lib/analytics/ai-spend";

export async function GET(request: Request) {
  try {
    const session = await authenticate(request, "view_ai_spend");
    const { searchParams } = new URL(request.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const startDate = from ? new Date(from) : undefined;
    const endDate = to ? new Date(to) : undefined;

    const analytics = await getAiSpendAnalytics(session.organizationId, startDate, endDate);
    return jsonSuccess(analytics);
  } catch (err) {
    return handleApiError(err);
  }
}

