import { authenticate } from "@/lib/auth/session";
import { jsonSuccess, handleApiError } from "@/lib/api-response";
import { commitImportJob } from "@/lib/ingestion/staging-engine";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authenticate(request, "import_financial_records");
    const { id } = await params;

    const result = await commitImportJob(id, session.organizationId, session.userId);

    return jsonSuccess({
      message: `Import committed. Successfully ingested ${result.committedRecords} records into verified database tables.`,
      ...result,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

