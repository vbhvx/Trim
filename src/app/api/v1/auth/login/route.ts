import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyPassword, createSessionToken } from "@/lib/auth/session";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/api-response";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  organizationId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, organizationId } = LoginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memberships: {
          include: { organization: true },
        },
      },
    });

    if (!user) {
      return jsonError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return jsonError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    if (user.memberships.length === 0) {
      return jsonError("User is not associated with any organization", 403, "NO_ORGANIZATION");
    }

    // Select requested org or default to first
    let selectedMembership = user.memberships[0];
    if (organizationId) {
      const found = user.memberships.find((m) => m.organizationId === organizationId);
      if (found) selectedMembership = found;
    }

    const token = await createSessionToken({
      userId: user.id,
      organizationId: selectedMembership.organizationId,
      role: selectedMembership.role,
      email: user.email,
      name: user.name,
    });

    const response = jsonSuccess({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      organization: {
        id: selectedMembership.organization.id,
        name: selectedMembership.organization.name,
        defaultCurrency: selectedMembership.organization.defaultCurrency,
        role: selectedMembership.role,
      },
      availableOrganizations: user.memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        role: m.role,
      })),
    });

    // Set HTTP-only cookie for browser navigation
    response.cookies.set("trim_session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (err) {
    return handleApiError(err);
  }
}

