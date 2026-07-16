import { z } from "zod";
import prisma from "@/lib/prisma";
import { authenticate } from "@/lib/auth/session";
import { jsonSuccess, handleApiError } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit/logger";

const CreateVendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  category: z.string().default("General SaaS"),
  website: z.string().url().optional().or(z.literal("")),
  billingCurrency: z.string().default("USD"),
});

export async function GET(request: Request) {
  try {
    const session = await authenticate(request, "read_financial_reports");

    const vendors = await prisma.vendor.findMany({
      where: { organizationId: session.organizationId },
      include: {
        _count: {
          select: {
            subscriptions: true,
            invoices: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return jsonSuccess(vendors);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const session = await authenticate(request, "manage_subscriptions");
    const body = await request.json();
    const data = CreateVendorSchema.parse(body);

    const vendor = await prisma.vendor.create({
      data: {
        organizationId: session.organizationId,
        name: data.name,
        category: data.category,
        website: data.website || null,
        billingCurrency: data.billingCurrency.toUpperCase(),
      },
    });

    await createAuditLog({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "VENDOR_CREATED",
      entityType: "Vendor",
      entityId: vendor.id,
      details: { name: vendor.name, category: vendor.category },
    });

    return jsonSuccess(vendor, undefined, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

