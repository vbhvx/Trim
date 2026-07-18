import { z } from "zod";
import prisma from "@/lib/prisma";
import { authenticate } from "@/lib/auth/session";
import { jsonSuccess, handleApiError } from "@/lib/api-response";
import { SourceType } from "@prisma/client";
import { stageImportFile } from "@/lib/ingestion/staging-engine";

const CreateImportSchema = z.object({
  sourceType: z.nativeEnum(SourceType),
  fileName: z.string().min(1),
  csvContent: z.string().min(1, "CSV content cannot be empty"),
});

export async function GET(request: Request) {
  try {
    const session = await authenticate(request, "import_financial_records");

    const jobs = await prisma.importJob.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        sourceType: true,
        status: true,
        originalFileName: true,
        rowCount: true,
        acceptedCount: true,
        rejectedCount: true,
        duplicateCount: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
      },
    });

    return jsonSuccess(jobs);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const session = await authenticate(request, "import_financial_records");
    const body = await request.json();
    const data = CreateImportSchema.parse(body);

    const summary = await stageImportFile({
      organizationId: session.organizationId,
      userId: session.userId,
      sourceType: data.sourceType,
      fileName: data.fileName,
      fileContent: data.csvContent,
    });

    return jsonSuccess(
      {
        message: `Import staged. ${summary.acceptedCount} valid, ${summary.rejectedCount} rejected, ${summary.duplicateCount} duplicate.`,
        importJobId: summary.jobId,
        summary,
      },
      undefined,
      201
    );
  } catch (err) {
    return handleApiError(err);
  }
}

