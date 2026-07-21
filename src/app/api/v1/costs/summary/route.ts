import { authenticate } from "@/lib/auth/session";
import { jsonSuccess, handleApiError } from "@/lib/api-response";
import { getDashboardSpendSummary } from "@/lib/analytics/spend-summary";

export async function GET(request: Request) {
  try {
    const session = await authenticate(request, "read_financial_reports");
    const summary = await getDashboardSpendSummary(session.organizationId);
    return jsonSuccess(summary);
  } catch (err) {
    return handleApiError(err);
  }
}

