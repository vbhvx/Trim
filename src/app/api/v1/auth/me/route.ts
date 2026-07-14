import { authenticate } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { jsonSuccess, handleApiError } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const session = await authenticate(request);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        memberships: {
          include: { organization: true },
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const currentOrg = user.memberships.find((m) => m.organizationId === session.organizationId);

    return jsonSuccess({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      currentOrganization: currentOrg
        ? {
            id: currentOrg.organization.id,
            name: currentOrg.organization.name,
            defaultCurrency: currentOrg.organization.defaultCurrency,
            role: currentOrg.role,
          }
        : null,
      availableOrganizations: user.memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        role: m.role,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

