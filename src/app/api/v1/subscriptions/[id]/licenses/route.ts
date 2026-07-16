import prisma from "@/lib/prisma";
import { authenticate } from "@/lib/auth/session";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/api-response";
import { calculateSubscriptionSeatUtilization } from "@/lib/analytics/seat-utilization";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authenticate(request, "read_financial_reports");
    const { id } = await params;

    const sub = await prisma.subscription.findFirst({
      where: { id, organizationId: session.organizationId },
    });

    if (!sub) {
      return jsonError("Subscription not found", 404, "NOT_FOUND");
    }

    const licenses = await prisma.licenseAssignment.findMany({
      where: { subscriptionId: id, organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
    });

    const metrics = await calculateSubscriptionSeatUtilization(id);

    return jsonSuccess({
      metrics,
      licenses,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

