import { z } from "zod";
import { authenticate, createSessionToken } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/api-response";
import { Role } from "@prisma/client";

const SwitchRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

export async function POST(request: Request) {
  try {
    const session = await authenticate(request);
    const body = await request.json();
    const { role } = SwitchRoleSchema.parse(body);

    // Update the membership role in the database for the active user
    await prisma.organizationMembership.update({
      where: {
        organizationId_userId: {
          organizationId: session.organizationId,
          userId: session.userId,
        },
      },
      data: { role },
    });

    const token = await createSessionToken({
      ...session,
      role,
    });

    const response = jsonSuccess({
      message: `Role successfully switched to ${role}`,
      token,
      newRole: role,
    });

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

