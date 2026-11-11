import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { Permission, hasPermission } from "./rbac";
import prisma from "../prisma";

const DEV_FALLBACK_SECRET = "trim-platform-default-secret-key-32-chars-long!!";

// The fallback only applies outside production (local dev and tests).
function getSigningSecret(): Uint8Array {
  const secret = process.env.APP_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("APP_SECRET must be set in production");
    }
    return new TextEncoder().encode(DEV_FALLBACK_SECRET);
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  organizationId: string;
  role: Role;
  email: string;
  name: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSigningSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSigningSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(
  request?: Request
): Promise<SessionPayload | null> {
  let token: string | undefined;

  // 1. Try Authorization header
  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
  }

  // 2. Try cookie
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get("trim_session_token")?.value;
    } catch {
      // Cookies not accessible in current context
    }
  }

  if (!token) return null;
  return verifySessionToken(token);
}

export class AuthError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number = 401, code: string = "UNAUTHORIZED") {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export async function authenticate(
  request: Request,
  requiredPermission?: Permission
): Promise<SessionPayload> {
  const session = await getSessionFromRequest(request);
  if (!session) {
    throw new AuthError("Authentication required", 401, "UNAUTHENTICATED");
  }

  // Verify membership in database to prevent revoked access or role spoofing
  const membership = await prisma.organizationMembership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: session.organizationId,
        userId: session.userId,
      },
    },
  });

  if (!membership) {
    throw new AuthError(
      "User does not belong to the requested organization",
      403,
      "ORGANIZATION_ACCESS_DENIED"
    );
  }

  // Update session role if changed in DB
  const liveSession: SessionPayload = {
    ...session,
    role: membership.role,
  };

  if (requiredPermission && !hasPermission(liveSession.role, requiredPermission)) {
    throw new AuthError(
      `Forbidden: Role '${liveSession.role}' lacks permission '${requiredPermission}'`,
      403,
      "FORBIDDEN"
    );
  }

  return liveSession;
}

