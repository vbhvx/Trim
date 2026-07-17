import prisma from "@/lib/prisma";
import { authenticate } from "@/lib/auth/session";
import { jsonSuccess, jsonError, handleApiError } from "@/lib/api-response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authenticate(request, "view_invoices_contracts");
    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: session.organizationId },
      include: {
        vendor: true,
        lineItems: {
          include: { subscription: true },
        },
        discrepancies: true,
      },
    });

    if (!invoice) {
      return jsonError("Invoice not found", 404, "NOT_FOUND");
    }

    return jsonSuccess(invoice);
  } catch (err) {
    return handleApiError(err);
  }
}

