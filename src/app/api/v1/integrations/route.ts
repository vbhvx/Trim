import prisma from "@/lib/prisma";
import { authenticate } from "@/lib/auth/session";
import { jsonSuccess, handleApiError } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const session = await authenticate(request, "read_financial_reports");

    const connections = await prisma.integrationConnection.findMany({
      where: { organizationId: session.organizationId },
      select: {
        id: true,
        provider: true,
        connectionStatus: true,
        lastSuccessfulSyncAt: true,
        lastAttemptAt: true,
        errorCode: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
        // CRITICAL SECURITY RULE: Never return encrypted credentials or secrets!
      },
    });

    const supportedProviders = [
      { provider: "OPENAI", name: "OpenAI API", category: "AI API Provider", supported: true },
      { provider: "ANTHROPIC", name: "Anthropic Claude", category: "AI API Provider", supported: true },
      { provider: "AWS", name: "Amazon Web Services (Cost Explorer)", category: "Cloud Infrastructure", supported: true },
      { provider: "GOOGLE_CLOUD", name: "Google Cloud Billing", category: "Cloud Infrastructure", supported: true },
      { provider: "GITHUB", name: "GitHub Enterprise", category: "Developer Tools", supported: true },
      { provider: "SLACK", name: "Slack Enterprise", category: "Communication", supported: true },
      { provider: "GOOGLE_WORKSPACE", name: "Google Workspace", category: "Productivity", supported: true },
    ];

    return jsonSuccess({
      activeConnections: connections,
      supportedProviders,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

