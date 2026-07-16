import prisma from "@/lib/prisma";
import { authenticate } from "@/lib/auth/session";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/api-response";

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

    const usageRecords = await prisma.usageRecord.findMany({
      where: { subscriptionId: id, organizationId: session.organizationId },
      orderBy: { usageStartAt: "desc" },
      take: 100,
    });

    return jsonSuccess({
      subscriptionId: id,
      count: usageRecords.length,
      usageRecords,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

