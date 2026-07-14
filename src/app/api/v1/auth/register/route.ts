import { z } from "zod";
import prisma from "@/lib/prisma";
import { hashPassword, createSessionToken } from "@/lib/auth/session";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/api-response";
import { Role } from "@prisma/client";

const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  organizationName: z.string().min(2),
  defaultCurrency: z.string().default("USD"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = RegisterSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      return jsonError("User with this email already exists", 409, "USER_EXISTS");
    }

    const passwordHash = await hashPassword(data.password);

    // Create Organization, User, and Membership in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: data.organizationName,
          defaultCurrency: data.defaultCurrency.toUpperCase(),
        },
      });

      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email.toLowerCase(),
          passwordHash,
        },
      });

      const membership = await tx.organizationMembership.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: Role.ORGANIZATION_OWNER,
        },
      });

      return { org, user, membership };
    });

    const token = await createSessionToken({
      userId: result.user.id,
      organizationId: result.org.id,
      role: Role.ORGANIZATION_OWNER,
      email: result.user.email,
      name: result.user.name,
    });

    const response = jsonSuccess(
      {
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
        organization: {
          id: result.org.id,
          name: result.org.name,
          defaultCurrency: result.org.defaultCurrency,
          role: Role.ORGANIZATION_OWNER,
        },
      },
      undefined,
      201
    );

    response.cookies.set("trim_session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err) {
    return handleApiError(err);
  }
}

