import { Prisma } from "@prisma/client";
import prisma from "../prisma";

export interface AuditLogParams {
  organizationId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown> | Prisma.InputJsonValue;
  ipAddress?: string;
}

export async function createAuditLog(params: AuditLogParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: params.details as Prisma.InputJsonValue,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (err) {
    console.error("Failed to create audit log entry:", err);
    // Never fail the main business transaction because of an audit log write error
    return null;
  }
}

