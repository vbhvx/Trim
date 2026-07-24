import { z } from "zod";
import { authenticate } from "@/lib/auth/session";
import { jsonSuccess, handleApiError } from "@/lib/api-response";
import { verifyRecommendationSavings } from "@/lib/analytics/savings-verification";

const VerifySavingsSchema = z.object({
  actionTaken: z.string().min(3),
  implementationDate: z.string().default(() => new Date().toISOString()),
  baselineAmount: z.number().nonnegative(),
  actualAmountAfter: z.number().nonnegative(),
  currency: z.string().default("USD"),
  verificationMethod: z.string().min(3),
  evidenceReference: z.string().min(3),
  notes: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authenticate(request, "verify_realized_savings");
    const { id } = await params;
    const body = await request.json();
    const data = VerifySavingsSchema.parse(body);

    const result = await verifyRecommendationSavings({
      recommendationId: id,
      organizationId: session.organizationId,
      verifiedById: session.userId,
      userRole: session.role,
      actionTaken: data.actionTaken,
      implementationDate: new Date(data.implementationDate),
      baselineAmount: data.baselineAmount,
      actualAmountAfter: data.actualAmountAfter,
      currency: data.currency,
      verificationMethod: data.verificationMethod,
      evidenceReference: data.evidenceReference,
      notes: data.notes,
    });

    return jsonSuccess({
      message: "Savings verified and recorded successfully",
      ...result,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

