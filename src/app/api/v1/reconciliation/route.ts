import prisma from "@/lib/prisma";
import { authenticate } from "@/lib/auth/session";
import { jsonSuccess, handleApiError } from "@/lib/api-response";
import { runInvoiceReconciliation } from "@/lib/reconciliation/reconciler";

export async function GET(request: Request) {
  try {
    const session = await authenticate(request, "view_invoices_contracts");

    const discrepancies = await prisma.reconciliationDiscrepancy.findMany({
      where: { organizationId: session.organizationId },
      include: {
        invoice: { include: { vendor: true } },
        subscription: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonSuccess(discrepancies);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const session = await authenticate(request, "run_cost_analysis");

    const result = await runInvoiceReconciliation(session.organizationId);

    return jsonSuccess({
      message: "Invoice reconciliation completed",
      ...result,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

