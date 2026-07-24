export interface AiExplanationRequest {
  recommendationType: string;
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  assumptions: Record<string, unknown>;
  estimatedSavings: string;
  vendorName?: string;
  productName?: string;
}

export interface AiExplanationResult {
  executiveSummary: string;
  financialJustification: string;
  riskAssessment: string;
  suggestedActionPlan: string[];
  investigationQuestions: string[];
  providerUsed: string;
  isAiGenerated: boolean;
}

export async function generateExplanation(
  request: AiExplanationRequest
): Promise<AiExplanationResult> {
  const provider = process.env.AI_PROVIDER || "mock";
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  // If Gemini API key is available and configured
  if (provider === "gemini" && geminiApiKey) {
    try {
      const prompt = `You are a strict financial spend intelligence analyst.
Explain the following verified cost optimization opportunity. DO NOT alter financial numbers.
Title: ${request.title}
Type: ${request.recommendationType}
Estimated Savings: ${request.estimatedSavings}
Evidence: ${JSON.stringify(request.evidence)}
Assumptions: ${JSON.stringify(request.assumptions)}

Provide JSON response with keys: executiveSummary, financialJustification, riskAssessment, suggestedActionPlan (array), investigationQuestions (array).`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return {
            executiveSummary: parsed.executiveSummary,
            financialJustification: parsed.financialJustification,
            riskAssessment: parsed.riskAssessment,
            suggestedActionPlan: parsed.suggestedActionPlan || [],
            investigationQuestions: parsed.investigationQuestions || [],
            providerUsed: "gemini-1.5-flash",
            isAiGenerated: true,
          };
        }
      }
    } catch (err) {
      console.warn("External Gemini API call failed, falling back to deterministic template:", err);
    }
  }

  // Deterministic Grounded Fallback (100% reliable, zero hallucination)
  return getDeterministicTemplateExplanation(request);
}

export function getDeterministicTemplateExplanation(
  request: AiExplanationRequest
): AiExplanationResult {
  const { title, recommendationType, estimatedSavings, evidence, assumptions } = request;

  let risk = "Low risk. Actions are administrative and reversible before final billing cycle.";
  const actions: string[] = [];
  const questions: string[] = [];

  switch (recommendationType) {
    case "UNASSIGNED_SEATS":
      actions.push("Audit license management dashboard in the vendor console.");
      actions.push("Reduce purchased seat tier to match current employee count at next billing cycle.");
      actions.push("Assign reserved seats only as new team members join.");
      questions.push("Are any upcoming team hires slated to start within the next 30 days?");
      questions.push("Does the vendor contract penalize mid-cycle seat decreases?");
      risk = "Negligible operational impact. No active users or workflows are interrupted.";
      break;

    case "INACTIVE_SEATS":
      actions.push("Send 7-day re-engagement notification to inactive users.");
      actions.push("Reallocate unneeded seats or de-provision inactive accounts.");
      questions.push("Are users on extended medical/parental leave or project hiatus?");
      questions.push("Do any service accounts or integrations rely on these user credentials?");
      risk = "Low risk if verified with department heads prior to de-provisioning.";
      break;

    case "DUPLICATE_SUBSCRIPTION":
      actions.push("Compare feature tiers and data retention between the two active accounts.");
      actions.push("Migrate users and workspaces from the secondary account to the primary account.");
      actions.push("Schedule cancellation of duplicate subscription before renewal date.");
      questions.push("Does one subscription store segregated customer data required for compliance?");
      questions.push("What are the cancellation notice window requirements?");
      risk = "Moderate risk: data migration must be completed prior to account deactivation.";
      break;

    case "INVOICE_DISCREPANCY":
      actions.push("Review vendor invoice PDF against contractual order form.");
      actions.push("Contact vendor billing department with invoice reference to request credit memo.");
      questions.push("Were one-off setup fees, taxes, or unannounced price increases applied?");
      risk = "Zero operational risk. Purely financial dispute process.";
      break;

    case "AI_SPEND_BUDGET":
      actions.push("Implement server-side prompt caching for repetitive user queries.");
      actions.push("Route routine summarization and classification to smaller/faster models.");
      actions.push("Set strict per-developer budget caps and automated spend alerts.");
      questions.push("Which application routes account for the highest token consumption?");
      questions.push("Can temperature and max_tokens parameters be reduced without quality loss?");
      risk = "Low-to-moderate: test latency and output accuracy before switching models.";
      break;

    default:
      actions.push("Review contract terms and current usage benchmarks.");
      actions.push("Present findings to procurement and finance teams.");
      questions.push("Can this software commitment be renegotiated on longer multi-year terms?");
  }

  return {
    executiveSummary: `Analysis of ${title} indicates a projected monthly savings of ${estimatedSavings}. Opportunity identified based on verifiable records with explicit assumptions.`,
    financialJustification: `Estimated reduction of ${estimatedSavings}/mo (${assumptions.formula || "calculated from baseline spend"}). Supported by evidence: ${JSON.stringify(evidence)}.`,
    riskAssessment: risk,
    suggestedActionPlan: actions,
    investigationQuestions: questions,
    providerUsed: "deterministic-rules-engine",
    isAiGenerated: false,
  };
}

