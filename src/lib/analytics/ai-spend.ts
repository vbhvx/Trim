import { Decimal, roundToCents, toDecimal } from "../financial/decimal";
import prisma from "../prisma";

export interface ModelSpendSummary {
  modelIdentifier: string;
  provider: string;
  inputTokens: Decimal;
  outputTokens: Decimal;
  cachedTokens: Decimal;
  totalTokens: Decimal;
  apiRequests: number;
  reportedCost: Decimal;
  costPer1MTokens: Decimal;
  costPerRequest: Decimal;
}

export interface AiSpendAnalyticsResult {
  totalReportedCost: Decimal;
  totalTokens: Decimal;
  totalRequests: number;
  providerBreakdown: Array<{ provider: string; cost: Decimal; tokenSharePct: number }>;
  modelBreakdown: ModelSpendSummary[];
  projectBreakdown: Array<{ project: string; cost: Decimal; requests: number }>;
  anomaliesDetected: Array<{
    type: "SPEND_SPIKE" | "BUDGET_EXCEEDED" | "HIGH_COST_PER_REQ";
    severity: "CRITICAL" | "HIGH" | "MEDIUM";
    description: string;
    metric: string;
    currentValue: string;
    baselineValue: string;
  }>;
}

export async function getAiSpendAnalytics(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<AiSpendAnalyticsResult> {
  const whereClause: {
    organizationId: string;
    usageStartAt?: { gte?: Date; lte?: Date };
  } = { organizationId };

  if (startDate || endDate) {
    whereClause.usageStartAt = {};
    if (startDate) whereClause.usageStartAt.gte = startDate;
    if (endDate) whereClause.usageStartAt.lte = endDate;
  }

  const records = await prisma.usageRecord.findMany({
    where: whereClause,
    include: { vendor: true },
    orderBy: { usageStartAt: "asc" },
  });

  let totalReportedCost = new Decimal(0);
  let totalTokens = new Decimal(0);
  let totalRequests = 0;

  const modelMap = new Map<
    string,
    {
      model: string;
      provider: string;
      input: Decimal;
      output: Decimal;
      cached: Decimal;
      requests: number;
      cost: Decimal;
    }
  >();

  const providerMap = new Map<string, { cost: Decimal; tokens: Decimal }>();
  const projectMap = new Map<string, { cost: Decimal; requests: number }>();

  for (const r of records) {
    const cost = toDecimal(r.reportedCost ?? 0);
    const qty = toDecimal(r.quantity);
    const provider = r.vendor.name;
    const model = r.modelIdentifier || "Standard Model";
    const project = r.projectIdentifier || "General AI Services";

    totalReportedCost = totalReportedCost.plus(cost);

    // Provider aggregation
    const pEntry = providerMap.get(provider) || { cost: new Decimal(0), tokens: new Decimal(0) };
    pEntry.cost = pEntry.cost.plus(cost);

    // Project aggregation
    const projEntry = projectMap.get(project) || { cost: new Decimal(0), requests: 0 };
    projEntry.cost = projEntry.cost.plus(cost);

    // Model aggregation
    const mKey = `${provider}::${model}`;
    const mEntry = modelMap.get(mKey) || {
      model,
      provider,
      input: new Decimal(0),
      output: new Decimal(0),
      cached: new Decimal(0),
      requests: 0,
      cost: new Decimal(0),
    };

    mEntry.cost = mEntry.cost.plus(cost);

    if (r.metricName === "input_tokens") {
      mEntry.input = mEntry.input.plus(qty);
      totalTokens = totalTokens.plus(qty);
      pEntry.tokens = pEntry.tokens.plus(qty);
    } else if (r.metricName === "output_tokens") {
      mEntry.output = mEntry.output.plus(qty);
      totalTokens = totalTokens.plus(qty);
      pEntry.tokens = pEntry.tokens.plus(qty);
    } else if (r.metricName === "cached_tokens") {
      mEntry.cached = mEntry.cached.plus(qty);
      totalTokens = totalTokens.plus(qty);
      pEntry.tokens = pEntry.tokens.plus(qty);
    } else if (r.metricName === "api_requests") {
      const reqCount = qty.toNumber();
      mEntry.requests += reqCount;
      totalRequests += reqCount;
      projEntry.requests += reqCount;
    }

    modelMap.set(mKey, mEntry);
    providerMap.set(provider, pEntry);
    projectMap.set(project, projEntry);
  }

  // Build model summaries
  const modelBreakdown: ModelSpendSummary[] = [];
  modelMap.forEach((entry) => {
    const totalTokensForModel = entry.input.plus(entry.output).plus(entry.cached);
    const costPer1MTokens = totalTokensForModel.greaterThan(0)
      ? roundToCents(entry.cost.dividedBy(totalTokensForModel).times(1_000_000))
      : new Decimal(0);
    const costPerRequest = entry.requests > 0
      ? roundToCents(entry.cost.dividedBy(entry.requests))
      : new Decimal(0);

    modelBreakdown.push({
      modelIdentifier: entry.model,
      provider: entry.provider,
      inputTokens: entry.input,
      outputTokens: entry.output,
      cachedTokens: entry.cached,
      totalTokens: totalTokensForModel,
      apiRequests: entry.requests,
      reportedCost: roundToCents(entry.cost),
      costPer1MTokens,
      costPerRequest,
    });
  });

  // Build provider summaries
  const providerBreakdown = Array.from(providerMap.entries()).map(([provider, val]) => ({
    provider,
    cost: roundToCents(val.cost),
    tokenSharePct: totalTokens.greaterThan(0)
      ? Number(val.tokens.dividedBy(totalTokens).times(100).toFixed(1))
      : 0,
  }));

  // Build project summaries
  const projectBreakdown = Array.from(projectMap.entries()).map(([project, val]) => ({
    project,
    cost: roundToCents(val.cost),
    requests: val.requests,
  }));

  // Anomaly Detection
  const anomalies: AiSpendAnalyticsResult["anomaliesDetected"] = [];

  // Check for models with unusually high cost per request (> $0.15)
  for (const m of modelBreakdown) {
    if (m.apiRequests >= 50 && m.costPerRequest.greaterThan(new Decimal("0.15"))) {
      anomalies.push({
        type: "HIGH_COST_PER_REQ",
        severity: "HIGH",
        description: `Model '${m.modelIdentifier}' has elevated unit cost of $${m.costPerRequest.toFixed(2)}/req across ${m.apiRequests} requests`,
        metric: "Cost per Request",
        currentValue: `$${m.costPerRequest.toFixed(2)}`,
        baselineValue: "$0.04/req benchmark",
      });
    }
  }

  // Check overall monthly run-rate against a benchmark budget ($5,000)
  if (totalReportedCost.greaterThan(new Decimal(5000))) {
    anomalies.push({
      type: "BUDGET_EXCEEDED",
      severity: "CRITICAL",
      description: `Cumulative AI spend ($${totalReportedCost.toFixed(2)}) exceeds standard team allocation of $5,000`,
      metric: "Total AI Spend",
      currentValue: `$${totalReportedCost.toFixed(2)}`,
      baselineValue: "$5,000.00",
    });
  }

  return {
    totalReportedCost: roundToCents(totalReportedCost),
    totalTokens,
    totalRequests,
    providerBreakdown,
    modelBreakdown,
    projectBreakdown,
    anomaliesDetected: anomalies,
  };
}

