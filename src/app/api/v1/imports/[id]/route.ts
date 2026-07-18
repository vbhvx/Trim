import prisma from "@/lib/prisma";
import { authenticate } from "@/lib/auth/session";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/api-response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authenticate(request, "import_financial_records");
    const { id } = await params;

    const job = await prisma.importJob.findFirst({
      where: { id, organizationId: session.organizationId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!job) {
      return jsonError("Import job not found", 404, "NOT_FOUND");
    }

    return jsonSuccess(job);
  } catch (err) {
    return handleApiError(err);
  }
}

