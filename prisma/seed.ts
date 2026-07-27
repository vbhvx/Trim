import { PrismaClient, Role, SubscriptionStatus, BillingInterval, SourceType, SeatStatus, InvoiceStatus, Priority, Confidence, RecommendationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import Decimal from "decimal.js";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Clear existing records in dev database safely
  await prisma.recommendationOutcome.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.reconciliationDiscrepancy.deleteMany();
  await prisma.normalizedCostRecord.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.usageRecord.deleteMany();
  await prisma.licenseAssignment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.planPricingTerms.deleteMany();
  await prisma.integrationConnection.deleteMany();
  await prisma.importJob.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.organizationMembership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.exchangeRate.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Create Organizations
  const acmeOrg = await prisma.organization.create({
    data: {
      name: "Acme Corporation",
      defaultCurrency: "USD",
    },
  });

  const globexOrg = await prisma.organization.create({
    data: {
      name: "Globex Industries",
      defaultCurrency: "USD",
    },
  });

  // 2. Create Users & Memberships for Acme Corp
  const ownerUser = await prisma.user.create({
    data: { name: "Alice Owner", email: "owner@acme.com", passwordHash },
  });
  await prisma.organizationMembership.create({
    data: { organizationId: acmeOrg.id, userId: ownerUser.id, role: Role.ORGANIZATION_OWNER },
  });

  const adminUser = await prisma.user.create({
    data: { name: "Bob Admin", email: "admin@acme.com", passwordHash },
  });
  await prisma.organizationMembership.create({
    data: { organizationId: acmeOrg.id, userId: adminUser.id, role: Role.ADMIN },
  });

  const financeUser = await prisma.user.create({
    data: { name: "Fiona Finance", email: "finance@acme.com", passwordHash },
  });
  await prisma.organizationMembership.create({
    data: { organizationId: acmeOrg.id, userId: financeUser.id, role: Role.FINANCE_MANAGER },
  });

  const engUser = await prisma.user.create({
    data: { name: "Eric Engineering", email: "eng@acme.com", passwordHash },
  });
  await prisma.organizationMembership.create({
    data: { organizationId: acmeOrg.id, userId: engUser.id, role: Role.ENGINEERING_MANAGER },
  });

  const itUser = await prisma.user.create({
    data: { name: "Ian IT", email: "it@acme.com", passwordHash },
  });
  await prisma.organizationMembership.create({
    data: { organizationId: acmeOrg.id, userId: itUser.id, role: Role.IT_ADMIN },
  });

  const viewerUser = await prisma.user.create({
    data: { name: "Victor Viewer", email: "viewer@acme.com", passwordHash },
  });
  await prisma.organizationMembership.create({
    data: { organizationId: acmeOrg.id, userId: viewerUser.id, role: Role.ANALYST_VIEWER },
  });

  // Competitor User in Globex for multi-tenant isolation testing
  const globexUser = await prisma.user.create({
    data: { name: "George Globex", email: "competitor@globex.com", passwordHash },
  });
  await prisma.organizationMembership.create({
    data: { organizationId: globexOrg.id, userId: globexUser.id, role: Role.ORGANIZATION_OWNER },
  });

  // 3. Seed Exchange Rates
  await prisma.exchangeRate.createMany({
    data: [
      { fromCurrency: "EUR", toCurrency: "USD", rate: new Decimal("1.085000"), effectiveDate: new Date(), source: "ECB" },
      { fromCurrency: "GBP", toCurrency: "USD", rate: new Decimal("1.272000"), effectiveDate: new Date(), source: "BOE" },
      { fromCurrency: "CAD", toCurrency: "USD", rate: new Decimal("0.741000"), effectiveDate: new Date(), source: "BOC" },
    ],
  });

  // 4. Create Acme Vendors
  const openai = await prisma.vendor.create({
    data: { organizationId: acmeOrg.id, name: "OpenAI", category: "AI API Provider", website: "https://openai.com" },
  });
  const anthropic = await prisma.vendor.create({
    data: { organizationId: acmeOrg.id, name: "Anthropic", category: "AI API Provider", website: "https://anthropic.com" },
  });
  const slack = await prisma.vendor.create({
    data: { organizationId: acmeOrg.id, name: "Slack Technologies", category: "Communication", website: "https://slack.com" },
  });
  const github = await prisma.vendor.create({
    data: { organizationId: acmeOrg.id, name: "GitHub", category: "Developer Tools", website: "https://github.com" },
  });
  const figma = await prisma.vendor.create({
    data: { organizationId: acmeOrg.id, name: "Figma", category: "Design Tools", website: "https://figma.com" },
  });
  const datadog = await prisma.vendor.create({
    data: { organizationId: acmeOrg.id, name: "Datadog", category: "Monitoring & Observability", website: "https://datadoghq.com" },
  });
  const zoom = await prisma.vendor.create({
    data: { organizationId: acmeOrg.id, name: "Zoom Video", category: "Communication", website: "https://zoom.us" },
  });

  // Also create a vendor in Globex Org
  await prisma.vendor.create({
    data: { organizationId: globexOrg.id, name: "Secret Globex Vendor", category: "Defense", website: "https://globex.com" },
  });

  // 5. Create Subscriptions
  // 5A. Slack Enterprise (Annual $18,000/yr -> $1,500/mo, 100 seats)
  const slackSub = await prisma.subscription.create({
    data: {
      organizationId: acmeOrg.id,
      vendorId: slack.id,
      productName: "Slack Business+",
      planName: "Business+ Annual",
      billingInterval: BillingInterval.ANNUAL,
      expectedAmount: new Decimal("18000.00"),
      renewalAt: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
      seatQuantity: 100,
      ownerId: itUser.id,
      status: SubscriptionStatus.ACTIVE,
    },
  });

  // 5B. Figma Organization (Monthly $3,600/mo, 80 seats, $45/seat)
  const figmaSub = await prisma.subscription.create({
    data: {
      organizationId: acmeOrg.id,
      vendorId: figma.id,
      productName: "Figma Organization",
      planName: "Organization Tier",
      billingInterval: BillingInterval.MONTHLY,
      expectedAmount: new Decimal("3600.00"),
      seatQuantity: 80,
      ownerId: engUser.id,
      status: SubscriptionStatus.ACTIVE,
    },
  });

  // 5C. GitHub Enterprise 1 (Primary - $4,200/mo, 200 seats)
  const githubSub1 = await prisma.subscription.create({
    data: {
      organizationId: acmeOrg.id,
      vendorId: github.id,
      productName: "GitHub Enterprise Cloud",
      planName: "Enterprise Cloud",
      billingInterval: BillingInterval.MONTHLY,
      expectedAmount: new Decimal("4200.00"),
      seatQuantity: 200,
      ownerId: engUser.id,
      status: SubscriptionStatus.ACTIVE,
      sourceReference: "gh-org-primary-acme",
    },
  });

  // 5D. GitHub Enterprise 2 (Duplicate created by data team - $1,050/mo, 50 seats)
  const githubSub2 = await prisma.subscription.create({
    data: {
      organizationId: acmeOrg.id,
      vendorId: github.id,
      productName: "GitHub Enterprise Cloud",
      planName: "Enterprise Cloud (Data Team)",
      billingInterval: BillingInterval.MONTHLY,
      expectedAmount: new Decimal("1050.00"),
      seatQuantity: 50,
      ownerId: engUser.id,
      status: SubscriptionStatus.ACTIVE,
      sourceReference: "gh-org-primary-acme", // Identical external ID!
    },
  });

  // 5E. Datadog Pro (Approaching renewal in 14 days! $14,400/yr -> $1,200/mo)
  const datadogSub = await prisma.subscription.create({
    data: {
      organizationId: acmeOrg.id,
      vendorId: datadog.id,
      productName: "Datadog APM & Logs",
      planName: "Pro Annual",
      billingInterval: BillingInterval.ANNUAL,
      expectedAmount: new Decimal("14400.00"),
      renewalAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // In 14 days
      ownerId: engUser.id,
      status: SubscriptionStatus.ACTIVE,
    },
  });

  // 5F. OpenAI API (Usage-Based, ~$2,800/mo)
  const openaiSub = await prisma.subscription.create({
    data: {
      organizationId: acmeOrg.id,
      vendorId: openai.id,
      productName: "OpenAI API Platform",
      planName: "Tier 5 Pay-as-you-go",
      billingInterval: BillingInterval.USAGE_BASED,
      expectedAmount: new Decimal("2800.00"),
      ownerId: engUser.id,
      status: SubscriptionStatus.ACTIVE,
    },
  });

  // 5G. Zoom Pro (Capability overlap with Slack Huddles - $600/mo, unknown activity)
  const zoomSub = await prisma.subscription.create({
    data: {
      organizationId: acmeOrg.id,
      vendorId: zoom.id,
      productName: "Zoom Meetings Pro",
      planName: "Pro Monthly",
      billingInterval: BillingInterval.MONTHLY,
      expectedAmount: new Decimal("600.00"),
      seatQuantity: 30,
      ownerId: itUser.id,
      status: SubscriptionStatus.ACTIVE,
    },
  });

  // 6. License Assignments
  // Figma: 80 purchased seats. Assign 55 seats, leaving 25 unassigned!
  for (let i = 1; i <= 55; i++) {
    await prisma.licenseAssignment.create({
      data: {
        organizationId: acmeOrg.id,
        subscriptionId: figmaSub.id,
        externalIdentity: `designer${i}@acme.com`,
        seatStatus: SeatStatus.ASSIGNED,
        lastActivityAt: new Date(Date.now() - Math.floor(Math.random() * 20) * 24 * 60 * 60 * 1000),
      },
    });
  }

  // Slack: 100 purchased seats. Assign 90 seats:
  // 75 active users, 15 users inactive for >45 days
  for (let i = 1; i <= 75; i++) {
    await prisma.licenseAssignment.create({
      data: {
        organizationId: acmeOrg.id,
        subscriptionId: slackSub.id,
        externalIdentity: `employee${i}@acme.com`,
        seatStatus: SeatStatus.ASSIGNED,
        lastActivityAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // active 5 days ago
      },
    });
  }
  for (let i = 76; i <= 90; i++) {
    await prisma.licenseAssignment.create({
      data: {
        organizationId: acmeOrg.id,
        subscriptionId: slackSub.id,
        externalIdentity: `inactive${i}@acme.com`,
        seatStatus: SeatStatus.ASSIGNED,
        lastActivityAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000), // inactive 55 days ago
      },
    });
  }

  // Zoom: 30 seats, but vendor exposes NO activity timestamps (all null)
  for (let i = 1; i <= 30; i++) {
    await prisma.licenseAssignment.create({
      data: {
        organizationId: acmeOrg.id,
        subscriptionId: zoomSub.id,
        externalIdentity: `zoomuser${i}@acme.com`,
        seatStatus: SeatStatus.ASSIGNED,
        lastActivityAt: null, // Unknown activity! Must NOT mark as unused
      },
    });
  }

  // 7. Invoices with deliberate real-world reconciliation scenarios
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Normal Paid Invoices
  await prisma.invoice.create({
    data: {
      organizationId: acmeOrg.id,
      vendorId: slack.id,
      invoiceNumber: "INV-SLACK-2026-001",
      currency: "USD",
      subtotal: new Decimal("18000.00"),
      tax: new Decimal("0.00"),
      total: new Decimal("18000.00"),
      invoiceDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      status: InvoiceStatus.PAID,
      lineItems: {
        create: [{ description: "Slack Business+ 100 Seats Annual", amount: new Decimal("18000.00") }],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      organizationId: acmeOrg.id,
      vendorId: figma.id,
      invoiceNumber: "INV-FIGMA-OCT26",
      currency: "USD",
      subtotal: new Decimal("3600.00"),
      tax: new Decimal("0.00"),
      total: new Decimal("3600.00"),
      invoiceDate: currentMonthStart,
      status: InvoiceStatus.PAID,
      lineItems: {
        create: [{ description: "Figma Organization Monthly (80 seats)", amount: new Decimal("3600.00") }],
      },
    },
  });

  // Invoice with UNEXPECTED PRICE HIKE (+38% increase from expected $4,200 to $5,800)
  await prisma.invoice.create({
    data: {
      organizationId: acmeOrg.id,
      vendorId: github.id,
      invoiceNumber: "INV-GH-NOV26-OVERCHARGE",
      currency: "USD",
      subtotal: new Decimal("5800.00"),
      tax: new Decimal("0.00"),
      total: new Decimal("5800.00"),
      invoiceDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: InvoiceStatus.PENDING,
      lineItems: {
        create: [{ description: "GitHub Enterprise Cloud (unannounced tier increase)", amount: new Decimal("5800.00") }],
      },
    },
  });

  // 8. AI Usage Records
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // OpenAI gpt-4o usage
  await prisma.usageRecord.create({
    data: {
      organizationId: acmeOrg.id,
      vendorId: openai.id,
      subscriptionId: openaiSub.id,
      metricName: "input_tokens",
      quantity: new Decimal("45000000"), // 45M tokens
      unit: "tokens",
      usageStartAt: weekAgo,
      usageEndAt: yesterday,
      reportedCost: new Decimal("225.00"),
      modelIdentifier: "gpt-4o",
      projectIdentifier: "customer-support-copilot",
    },
  });
  await prisma.usageRecord.create({
    data: {
      organizationId: acmeOrg.id,
      vendorId: openai.id,
      subscriptionId: openaiSub.id,
      metricName: "output_tokens",
      quantity: new Decimal("12000000"), // 12M tokens
      unit: "tokens",
      usageStartAt: weekAgo,
      usageEndAt: yesterday,
      reportedCost: new Decimal("180.00"),
      modelIdentifier: "gpt-4o",
      projectIdentifier: "customer-support-copilot",
    },
  });
  await prisma.usageRecord.create({
    data: {
      organizationId: acmeOrg.id,
      vendorId: openai.id,
      subscriptionId: openaiSub.id,
      metricName: "api_requests",
      quantity: new Decimal("85000"),
      unit: "requests",
      usageStartAt: weekAgo,
      usageEndAt: yesterday,
      reportedCost: new Decimal("0.00"),
      modelIdentifier: "gpt-4o",
      projectIdentifier: "customer-support-copilot",
    },
  });

  // Anthropic claude-3-5-sonnet usage
  await prisma.usageRecord.create({
    data: {
      organizationId: acmeOrg.id,
      vendorId: anthropic.id,
      metricName: "input_tokens",
      quantity: new Decimal("28000000"),
      unit: "tokens",
      usageStartAt: weekAgo,
      usageEndAt: yesterday,
      reportedCost: new Decimal("84.00"),
      modelIdentifier: "claude-3-5-sonnet",
      projectIdentifier: "code-review-bot",
    },
  });
  await prisma.usageRecord.create({
    data: {
      organizationId: acmeOrg.id,
      vendorId: anthropic.id,
      metricName: "output_tokens",
      quantity: new Decimal("8500000"),
      unit: "tokens",
      usageStartAt: weekAgo,
      usageEndAt: yesterday,
      reportedCost: new Decimal("127.50"),
      modelIdentifier: "claude-3-5-sonnet",
      projectIdentifier: "code-review-bot",
    },
  });
  await prisma.usageRecord.create({
    data: {
      organizationId: acmeOrg.id,
      vendorId: anthropic.id,
      metricName: "api_requests",
      quantity: new Decimal("32000"),
      unit: "requests",
      usageStartAt: weekAgo,
      usageEndAt: yesterday,
      reportedCost: new Decimal("0.00"),
      modelIdentifier: "claude-3-5-sonnet",
      projectIdentifier: "code-review-bot",
    },
  });

  // 9. Pre-seed Verified Recommendation and Lifecycle Examples
  // A verified outcome recommendation: De-provisioned 8 inactive legacy licenses
  const verifiedRec = await prisma.recommendation.create({
    data: {
      organizationId: acmeOrg.id,
      recommendationType: "INACTIVE_SEATS",
      title: "De-provision 8 inactive Salesforce seats",
      description: "De-provisioned 8 sales contractor seats inactive for >60 days following project completion.",
      status: RecommendationStatus.VERIFIED,
      priority: Priority.HIGH,
      estimatedSavings: new Decimal("1200.00"), // $1,200/mo
      savingsCurrency: "USD",
      confidence: Confidence.HIGH,
      evidenceReferences: {
        licensesDeProvisioned: 8,
        unitPrice: 150,
        activityCutoffDays: 60,
      },
      assumptions: {
        formula: "8 seats × $150/mo = $1,200/mo",
      },
    },
  });

  await prisma.recommendationOutcome.create({
    data: {
      recommendationId: verifiedRec.id,
      actionTaken: "De-provisioned 8 inactive contractor accounts and adjusted renewal order schedule.",
      implementationDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      baselineAmount: new Decimal("6000.00"),
      actualAmountAfter: new Decimal("4800.00"),
      realizedSavings: new Decimal("1200.00"),
      currency: "USD",
      verificationMethod: "Subsequent billing statement audit compared against baseline invoice.",
      evidenceReference: "Invoice #SFDC-OCT-REVISED",
      verifiedById: financeUser.id,
      verifiedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      notes: "Realized savings confirmed against banking auto-debit record.",
    },
  });

  // 10. Integrations
  await prisma.integrationConnection.create({
    data: {
      organizationId: acmeOrg.id,
      provider: "OPENAI",
      connectionStatus: "ACTIVE",
      credentialReference: "kms:ref:openai-prod-key",
      lastSuccessfulSyncAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
    },
  });
  await prisma.integrationConnection.create({
    data: {
      organizationId: acmeOrg.id,
      provider: "ANTHROPIC",
      connectionStatus: "ACTIVE",
      credentialReference: "kms:ref:anthropic-prod-key",
      lastSuccessfulSyncAt: new Date(Date.now() - 45 * 60 * 1000),
    },
  });

  console.log("✅ Seed completed successfully with realistic multi-tenant data!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

