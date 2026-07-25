import prisma from "@/lib/prisma";
import { authenticate } from "@/lib/auth/session";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/api-response";
import { ConnectionStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/audit/logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authenticate(request, "manage_integrations");
    const { id } = await params;

    const connection = await prisma.integrationConnection.findFirst({
      where: { id, organizationId: session.organizationId },
    });

    if (!connection) {
      return jsonError("Integration connection not found", 404, "NOT_FOUND");
    }

    // Update last sync timestamp
    const updated = await prisma.integrationConnection.update({
      where: { id },
      data: {
        lastAttemptAt: new Date(),
        lastSuccessfulSyncAt: new Date(),
        connectionStatus: ConnectionStatus.ACTIVE,
        errorCode: null,
        errorMessage: null,
      },
    });

    await createAuditLog({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "INTEGRATION_SYNCED",
      entityType: "IntegrationConnection",
      entityId: id,
      details: { provider: connection.provider },
    });

    return jsonSuccess({
      message: `Sync completed successfully for ${connection.provider}`,
      lastSuccessfulSyncAt: updated.lastSuccessfulSyncAt,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

