import prisma from "@/lib/prisma";
import { authenticate } from "@/lib/auth/session";
import { jsonSuccess, handleApiError } from "@/lib/api-response";
import { RecommendationStatus, Priority } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const session = await authenticate(request, "read_financial_reports");
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const type = searchParams.get("type");

    const where: any = { organizationId: session.organizationId };
    if (status) where.status = status as RecommendationStatus;
    if (priority) where.priority = priority as Priority;
    if (type) where.recommendationType = type;

    const recommendations = await prisma.recommendation.findMany({
      where,
      include: {
        outcomes: {
          include: {
            verifiedBy: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: [
        { priority: "asc" }, // CRITICAL first
        { estimatedSavings: "desc" },
      ],
    });

    return jsonSuccess(recommendations);
  } catch (err) {
    return handleApiError(err);
  }
}

