import { z } from "zod";
import prisma from "@/lib/prisma";
import { authenticate } from "@/lib/auth/session";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/api-response";
import { ConnectionStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/audit/logger";

const ConnectSchema = z.object({
  apiKey: z.string().min(10, "API key or token is required"),
  organizationIdentifier: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authenticate(request, "manage_integrations");
    const { id: provider } = await params;
    const body = await request.json();
    const data = ConnectSchema.parse(body);

    const provUpper = provider.toUpperCase();

    // Create or update connection
    const connection = await prisma.integrationConnection.upsert({
      where: {
        organizationId_provider: {
          organizationId: session.organizationId,
          provider: provUpper,
        },
      },
      update: {
        connectionStatus: ConnectionStatus.ACTIVE,
        credentialReference: `kms:ref:${provUpper.toLowerCase()}-${Date.now()}`,
        encryptedCredentials: Buffer.from(data.apiKey).toString("base64"), // In production, AES-GCM encrypted
        lastSuccessfulSyncAt: new Date(),
        errorCode: null,
        errorMessage: null,
      },
      create: {
        organizationId: session.organizationId,
        provider: provUpper,
        connectionStatus: ConnectionStatus.ACTIVE,
        credentialReference: `kms:ref:${provUpper.toLowerCase()}-${Date.now()}`,
        encryptedCredentials: Buffer.from(data.apiKey).toString("base64"),
        lastSuccessfulSyncAt: new Date(),
      },
    });

    await createAuditLog({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "INTEGRATION_CONNECTED",
      entityType: "IntegrationConnection",
      entityId: connection.id,
      details: { provider: provUpper },
    });

    return jsonSuccess({
      message: `${provUpper} integration successfully connected`,
      connection: {
        id: connection.id,
        provider: connection.provider,
        status: connection.connectionStatus,
        lastSuccessfulSyncAt: connection.lastSuccessfulSyncAt,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
