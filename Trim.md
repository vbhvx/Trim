# Technical Specification: AI & SaaS Spend Intelligence and Cost Optimization Platform

**Project Type:** Full-Stack SaaS Cost Management and Financial Intelligence Platform  
**Primary Focus:** SaaS Spend Visibility, AI API Cost Analysis, Subscription Management, Seat Utilization, Duplicate Detection, Invoice Reconciliation, Savings Recommendations, and Evidence-Based Reporting  
**Target Users:** Startup founders, engineering teams, finance teams, IT administrators, procurement teams, and SaaS operations managers  
**Engineering Objective:** Build a reliable cost-intelligence platform that consolidates fragmented software spending data, identifies verifiable optimization opportunities, estimates potential savings, and helps teams make financially justified decisions without relying on opaque AI recommendations.

## 1. Objective

Develop a centralized platform that helps organizations understand what they spend on AI services and SaaS tools, why they spend it, how effectively they use purchased capacity, and where they can reduce unnecessary costs.

Organizations frequently manage subscriptions, vendor invoices, pricing plans, employee seat counts, and AI usage across disconnected dashboards and spreadsheets. This makes it difficult to identify duplicate subscriptions, unused licenses, expensive plans, unexpected usage growth, and discrepancies between contractual pricing and actual charges.

The application should consolidate these sources into a consistent financial view and turn raw cost data into explainable, actionable recommendations.

The central engineering challenge is not simply displaying monthly spending. It is reconciling inconsistent financial records, normalizing vendor-specific usage information, calculating comparable costs, distinguishing actual savings from hypothetical savings, and supporting recommendations with verifiable evidence.

The finished application must allow users to:

1. Connect supported vendors or import spending data from CSV files, invoices, and other approved sources.
2. Maintain a consolidated inventory of AI tools, SaaS subscriptions, vendors, plans, contracts, and billing periods.
3. Normalize different pricing models and currencies into a comparable cost view.
4. Track subscription spending, purchased seats, assigned users, and available usage data.
5. Identify unused or underutilized licenses based on available evidence.
6. Detect potential duplicate subscriptions and overlapping capabilities.
7. Compare current plans against alternative pricing structures using explicit assumptions.
8. Analyze AI API usage, model-level spending, token consumption, and usage anomalies where supported.
9. Detect invoice discrepancies, price changes, renewals, and unexpected cost increases.
10. Generate prioritized recommendations with evidence, confidence, projected savings, and implementation steps.
11. Track recommendations through review, approval, implementation, and verified outcomes.
12. Produce reports that finance and engineering teams can use to justify spending decisions.

**Core principle:** Every financial recommendation must be explainable, every savings estimate must state its assumptions, and every claimed saving must be distinguished from a potential opportunity until the financial outcome is verified.

## 2. Product Scope

Build a cost-intelligence and optimization platform first. The initial product should focus on accurate visibility, reliable ingestion, transparent calculations, and practical recommendations rather than attempting to automate every procurement or finance workflow.

### 2.1 Core modules

| Module | Responsibility |
|---|---|
| Spend dashboard | Consolidate costs and expose trends, renewals, and anomalies |
| Vendor inventory | Maintain vendors, subscriptions, products, plans, and owners |
| Data ingestion | Import invoices, subscription records, usage exports, and supported API data |
| Pricing normalization | Convert vendor-specific pricing into a consistent internal representation |
| Seat utilization | Compare purchased seats with assigned and active seats when data is available |
| Duplicate detection | Identify likely duplicate subscriptions and overlapping tools |
| AI spend analytics | Analyze model usage, API costs, and provider-level cost trends |
| Invoice reconciliation | Compare invoices with plan expectations, usage records, and previous charges |
| Recommendation engine | Generate evidence-based optimization opportunities |
| Savings tracking | Record approved actions and measure realized financial outcomes |
| Reporting | Generate summaries for finance, engineering, and leadership |
| Access control | Protect organization financial data and restrict sensitive operations |

### 2.2 Supported data sources

The first release should prioritize sources that are feasible to obtain reliably.

Potential source categories include:

- Vendor billing APIs.
- Vendor usage or administration APIs.
- CSV and spreadsheet exports.
- Invoice files and structured invoice exports.
- Manually entered subscription records.
- Internal seat-assignment lists.
- AI provider usage exports.
- Exchange-rate data from an explicitly selected source, if multi-currency normalization is required.

A connector should be considered supported only when it has been implemented and tested against the vendor's actual interface or documented integration contract.

Do not assume every vendor exposes seat activity, detailed usage, contract terms, or billing APIs. Where data is unavailable, support manual entry or file import and clearly label the limitations.

## 3. Target Users and Permissions

Design the platform for multiple users within an organization, with financial information protected by explicit access boundaries.

### 3.1 Initial roles

| Role | Typical responsibilities |
|---|---|
| Organization Owner | Manage organization settings, memberships, and sensitive access |
| Admin | Configure integrations, imports, and organization-wide settings |
| Finance Manager | Review invoices, cost trends, budgets, and savings reports |
| Engineering Manager | Review technical services, usage patterns, and AI spend |
| IT / SaaS Administrator | Maintain subscription inventory and license assignments |
| Analyst / Viewer | Read authorized reports and analysis |

The role names describe intended responsibilities. The actual permission matrix must be implemented and tested rather than treated as a set of frontend labels.

### 3.2 Permission requirements

Permissions should distinguish between:

- Reading financial reports.
- Viewing invoices and contract information.
- Connecting vendor integrations.
- Importing and correcting financial records.
- Managing subscription ownership.
- Running or configuring optimization analyses.
- Approving recommendations.
- Marking savings as realized.
- Exporting sensitive financial information.
- Managing users and roles.

For example, an Engineering Manager may be permitted to view AI API usage but not alter billing integration credentials. A Viewer may read an approved report without being allowed to import invoices or declare savings realized.

## 4. Technical Stack

Use a TypeScript-first architecture with PostgreSQL as the primary source of truth for normalized financial and subscription data.

| Layer | Recommended technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| UI styling | Tailwind CSS and accessible UI primitives |
| Backend | Next.js route handlers or a dedicated Node.js API |
| Database | PostgreSQL |
| ORM | Drizzle ORM or Prisma |
| Runtime validation | Zod or an equivalent schema validation library |
| Authentication | Maintained authentication and session library |
| File ingestion | Validated CSV/XLSX parsing and controlled invoice extraction |
| Background jobs | Queue and worker system for ingestion, reconciliation, and analysis |
| AI integration | Provider-agnostic server-side adapter |
| Charts | A maintained charting library appropriate to the existing application |
| API documentation | OpenAPI 3.x where external APIs are exposed |
| Unit and integration testing | Vitest or Jest |
| End-to-end testing | Playwright |
| Deployment | Supported application hosting and managed PostgreSQL |

Choose one ORM and one primary backend architecture. Use background jobs when data ingestion or analysis exceeds a short request's reasonable execution time.

A separate analytical warehouse is not required for the initial release. PostgreSQL can support the first version if data volume, indexes, and reporting queries are designed appropriately.

## 5. System Architecture

Separate source ingestion, financial normalization, analytics, and recommendation generation so that recommendations can be traced back to source records.

```text
Vendor APIs / CSV / Invoices / Manual Inputs
                     |
                     v
             Source Adapters
                     |
                     v
          Validation and Staging
                     |
                     v
          Normalization Pipeline
                     |
          +----------+----------+
          |          |          |
          v          v          v
      Vendors    Subscriptions  Usage Records
          |          |          |
          +----------+----------+
                     |
                     v
              PostgreSQL
                     |
          +----------+-----------+
          |                      |
          v                      v
   Cost Calculations      Reconciliation
          |                      |
          +----------+-----------+
                     |
                     v
            Rules-Based Analysis
                     |
                     v
        Optional AI Recommendation Layer
                     |
                     v
           Evidence and Savings Model
                     |
          +----------+-----------+
          |                      |
          v                      v
      Dashboard              Reports
          |
          v
   Review / Approve / Track Outcomes
```

### Architectural responsibilities

**Source adapters:** Retrieve or parse source data through supported vendor APIs, exports, or manual uploads.

**Staging layer:** Preserve enough source information to troubleshoot import failures and identify duplicate records without prematurely trusting unvalidated data.

**Normalization pipeline:** Convert vendor-specific records into a consistent internal model while preserving currency, billing period, units, and provenance.

**Cost engine:** Calculate totals and comparisons deterministically using explicit financial rules.

**Recommendation engine:** Identify potential optimization opportunities from normalized records and predefined rules.

**AI adapter:** Optionally explain findings, summarize evidence, and improve the presentation of recommendations without controlling the underlying financial calculations.

**Review and outcome tracking:** Record what was approved, what action was taken, and whether the expected savings materialized.

**Reporting:** Expose only the data and calculations that the current user is authorized to access.

AI services must not become the sole source of financial truth. If an AI provider is unavailable, core cost reporting and deterministic recommendation rules should continue to work.

## 6. Data Model

Design a relational schema that preserves both normalized business records and the source evidence from which they were derived.

### 6.1 Organization

Fields:

- `id`
- `name`
- `createdAt`
- `updatedAt`

All organization-owned financial records must be scoped appropriately.

### 6.2 User and organization membership

**User**

- `id`
- `email`
- `name`
- Authentication identity reference
- `createdAt`
- `updatedAt`

**OrganizationMembership**

- `id`
- `organizationId`
- `userId`
- `role`
- `createdAt`
- `updatedAt`

Enforce uniqueness for the organization-user relationship.

Do not trust client-supplied role or organization identifiers as proof of authorization.

### 6.3 Vendor

Fields:

- `id`
- `organizationId`
- `name`
- `category`
- `website`
- `billingCurrency`
- `createdAt`
- `updatedAt`

Example categories include:

- AI API providers
- Developer tools
- Productivity software
- Cloud infrastructure
- Design tools
- Analytics platforms
- Communication tools
- Security services

Use controlled categories where useful, but allow new vendor categories without changing the entire database schema.

### 6.4 Subscription

Fields:

- `id`
- `organizationId`
- `vendorId`
- `productName`
- `planName`
- `billingInterval`
- `billingCurrency`
- `expectedAmount`
- `billingStartAt`
- `renewalAt`
- `contractEndAt`
- `seatQuantity`
- `ownerId`
- `status`
- `sourceType`
- `createdAt`
- `updatedAt`

Example status values:

`active`, `trial`, `pending_cancellation`, `cancelled`, `expired`, `unknown`

Use explicit billing intervals such as monthly, annual, quarterly, usage-based, or custom. Do not force every vendor contract into a monthly subscription model.

Contract start date, renewal date, billing period, and payment date are different concepts. Model them separately where the source data supports that distinction.

### 6.5 Plan and pricing terms

If the product must compare pricing options, define a pricing model capable of representing different charging structures.

Potential fields:

- `id`
- `vendorId`
- `productName`
- `planName`
- `currency`
- `pricingModel`
- `baseFee`
- `includedSeats`
- `seatPrice`
- `includedUsage`
- `overageRate`
- `billingInterval`
- `effectiveFrom`
- `effectiveTo`
- `sourceReference`
- `verifiedAt`

Possible pricing models include:

- Flat subscription
- Per-seat subscription
- Per-active-user subscription
- Tiered usage
- Metered usage
- Volume-based pricing
- Hybrid base-fee and usage pricing
- Custom contract

Store the pricing assumptions used for a comparison. If pricing information is incomplete, the platform must identify the missing terms rather than inventing a plan price.

### 6.6 License assignment

Fields:

- `id`
- `organizationId`
- `subscriptionId`
- `internalUserId`, where available
- `externalIdentity`
- `seatStatus`
- `assignedAt`
- `lastActivityAt`, where available
- `sourceReference`
- `createdAt`
- `updatedAt`

Use explicit values for statuses such as `assigned`, `unassigned`, `suspended`, or `unknown`, according to the supported source data.

Do not equate a missing activity timestamp with an unused license. Some vendors expose no activity data, and different products report activity differently.

### 6.7 Usage record

Fields:

- `id`
- `organizationId`
- `vendorId`
- `subscriptionId`
- `metricName`
- `quantity`
- `unit`
- `usageStartAt`
- `usageEndAt`
- `currency`
- `sourceReference`
- `ingestedAt`

Examples include:

- API requests
- Input tokens
- Output tokens
- Cached tokens, where separately reported
- Compute units
- Storage usage
- Active users
- Seats assigned
- Monthly active users
- Build minutes or execution minutes

Keep usage units explicit. A value of 10,000 tokens is not comparable to 10,000 API requests without a supported conversion or pricing model.

### 6.8 Invoice

Fields:

- `id`
- `organizationId`
- `vendorId`
- `invoiceNumber`
- `currency`
- `subtotal`
- `tax`
- `total`
- `invoiceDate`
- `billingPeriodStart`
- `billingPeriodEnd`
- `dueAt`
- `status`
- `sourceType`
- `sourceReference`
- `createdAt`

Use suitable decimal or integer-minor-unit representations. Never use binary floating-point arithmetic for financial totals.

Store the original invoice file or source reference according to an explicit retention and access policy.

### 6.9 Invoice line item

Fields:

- `id`
- `invoiceId`
- `description`
- `quantity`
- `unitPrice`
- `amount`
- `currency`
- `subscriptionId`, where matched
- `classification`
- `confidence`
- `sourceTextReference`

Invoice line extraction may be assisted by OCR or an AI model, but extracted amounts must be validated and reconciled against the document before being treated as verified financial records.

### 6.10 Integration connection

Fields:

- `id`
- `organizationId`
- `provider`
- `connectionStatus`
- `credentialReference`
- `lastSuccessfulSyncAt`
- `lastAttemptAt`
- `errorCode`
- `createdAt`
- `updatedAt`

Keep actual secrets in a suitable secret store or encrypted credential mechanism. Do not expose them to the browser or log them.

### 6.11 Import job

Fields:

- `id`
- `organizationId`
- `sourceType`
- `status`
- `fileReference`
- `rowCount`
- `acceptedCount`
- `rejectedCount`
- `duplicateCount`
- `errorSummary`
- `startedAt`
- `completedAt`
- `createdBy`

Possible states:

`queued`, `processing`, `completed`, `completed_with_errors`, `failed`, `cancelled`

### 6.12 Normalized cost record

Fields:

- `id`
- `organizationId`
- `vendorId`
- `subscriptionId`
- `invoiceId`
- `amount`
- `currency`
- `costCategory`
- `periodStart`
- `periodEnd`
- `costType`
- `sourceRecordId`
- `normalizedAt`

Distinguish actual charges, forecasted costs, estimated costs, and derived costs.

A predicted monthly cost must not be stored or displayed as if it were an invoiced charge.

### 6.13 Recommendation

Fields:

- `id`
- `organizationId`
- `recommendationType`
- `title`
- `description`
- `status`
- `priority`
- `estimatedSavings`
- `savingsCurrency`
- `confidence`
- `evidenceReferences`
- `assumptions`
- `modelOrRuleVersion`
- `createdAt`
- `updatedAt`

Suggested states:

`new`, `under_review`, `approved`, `rejected`, `in_progress`, `implemented`, `verified`, `not_realized`

### 6.14 Recommendation outcome

Fields:

- `id`
- `recommendationId`
- `actionTaken`
- `implementationDate`
- `baselineAmount`
- `actualAmountAfter`
- `realizedSavings`
- `currency`
- `verificationMethod`
- `evidenceReference`
- `verifiedBy`
- `verifiedAt`

This entity separates a savings hypothesis from the actual outcome.

### 6.15 Data provenance

For each imported, normalized, or derived record, preserve enough metadata to identify:

- The original source.
- The external record or import job.
- The source time range.
- The ingestion time.
- The transformation or normalization version.
- Whether the record was manually corrected.
- The level of verification.

This allows analysts to trace reports back to source data and investigate discrepancies without guessing how a number was produced.

## 7. Spend Normalization and Financial Calculations

Cost normalization is essential because vendors use different billing intervals, currencies, usage definitions, and pricing structures.

### 7.1 Financial precision

Use decimal arithmetic or integer minor units for currency calculations.

Avoid floating-point arithmetic for invoice amounts, price comparisons, annualized cost, and savings calculations.

Preserve the currency associated with each amount. Do not sum values in different currencies without a documented exchange-rate conversion.

### 7.2 Monthly cost normalization

For comparable flat subscriptions, calculate a normalized monthly equivalent.

Examples:

- Monthly subscription: monthly fee.
- Annual subscription: annual fee divided by 12 for a simple monthly equivalent.
- Quarterly subscription: quarterly fee divided by 3 for a simple monthly equivalent.

These calculations do not imply that the business paid that amount in each calendar month. Cash-flow reporting and normalized recurring-cost reporting should remain distinct.

For billing periods that do not align neatly with calendar months, use a documented allocation policy. Do not silently substitute a monthly average for actual invoice totals.

### 7.3 Usage-based pricing

Represent usage-based cost as a pricing calculation with explicit inputs.

For example:

\[
\text{Estimated Cost}
=
\text{Base Fee}
+
\sum_{i=1}^{n}
\left(
\text{Billable Quantity}_i
\times
\text{Unit Rate}_i
\right)
\]

The actual calculation may also depend on included quotas, tier boundaries, overage rates, discounts, minimum commitments, and other contract terms.

The system must not apply one generic usage formula to every vendor.

### 7.4 Current versus normalized spending

Provide separate views for:

- Invoiced amount
- Actual provider-reported usage charges, where available
- Current recurring commitment
- Estimated monthly equivalent
- Annualized recurring cost
- Forecast cost
- Potential savings

Make the time period and calculation method visible in reports.

### 7.5 Currency conversion

If the organization uses multiple billing currencies:

- Store the original amount and currency.
- Convert only for reports that specify a presentation currency.
- Use an explicit, dated exchange-rate source.
- Record the exchange rate and effective date used.
- Distinguish the converted analytical value from the amount charged by the provider.
- Avoid using a current exchange rate to silently rewrite historical reporting.

The selected exchange-rate source must be configurable and documented.

## 8. Subscription and Vendor Inventory

### 8.1 Consolidated subscription view

Display relevant information for each subscription, including:

- Vendor and product
- Plan
- Billing interval
- Actual cost and currency
- Normalized monthly cost
- Renewal date
- Contract end date where available
- Purchased seats
- Assigned seats
- Usage information
- Subscription owner
- Data freshness
- Integration or import source

Use a consistent status when data is missing. Never infer a specific renewal date or contract term without supporting information.

### 8.2 Subscription lifecycle

Support:

- Adding subscriptions.
- Editing plan and cost metadata.
- Assigning an internal owner.
- Updating seat counts.
- Recording renewal dates.
- Importing invoice or usage records.
- Marking subscriptions canceled or expired.
- Preserving historical spend after a subscription ends.

Do not delete historical financial information when a subscription is canceled.

### 8.3 Vendor grouping

Allow users to group costs by vendor and, where known, by product family.

A company may have separate products, accounts, billing entities, or plans from the same vendor. Do not automatically merge them into one subscription solely because their vendor names match.

### 8.4 Inventory completeness

Expose data-quality indicators such as:

- Missing owner
- Missing renewal date
- Missing contract amount
- Unknown seat quantity
- No recent usage data
- Invoice not matched to a subscription
- Conflicting vendor records

The platform should clearly distinguish a verified inventory from one built using incomplete manual records.

## 9. Seat Utilization and License Optimization

### 9.1 Utilization metrics

Where source data supports the required calculation, provide:

- Purchased seats
- Assigned seats
- Active seats
- Unassigned seats
- Inactive assigned seats
- Estimated utilization rate

Use separate definitions for each metric.

For example:

\[
\text{Assignment Rate}
=
\frac{\text{Assigned Seats}}{\text{Purchased Seats}}
\times 100
\]

\[
\text{Activity Rate}
=
\frac{\text{Active Seats}}{\text{Purchased Seats}}
\times 100
\]

These metrics are not interchangeable. An assigned user may be inactive, and an active user may be counted differently by the vendor.

Guard against division by zero and missing source data.

### 9.2 Inactivity rules

Allow organization-level policy settings for identifying potentially inactive seats, such as a selected activity window.

However, inactivity must be determined only when the connected vendor provides an appropriate, sufficiently fresh activity signal.

If no activity information is available, label the status as unknown instead of declaring the license unused.

### 9.3 Seat savings calculation

A basic potential-saving estimate for removing eligible seats is:

\[
\text{Potential Monthly Savings}
=
\text{Potentially Removable Seats}
\times
\text{Verified Price per Seat per Month}
\]

For tiered plans, minimum commitments, bundled pricing, or annual contracts, the savings calculation must use the actual pricing rules.

Removing a seat does not necessarily reduce the invoice. The UI must explain when seat reductions may not change the committed charge.

### 9.4 Seat recommendations

Produce recommendations such as:

- Review unassigned paid seats.
- Review inactive assigned licenses.
- Reassign an eligible license instead of purchasing another.
- Check seat counts before renewal.

Each recommendation should show the underlying seat count, applicable time window, source, price assumption, and expected financial impact.

Do not automatically remove users or revoke access based solely on inactivity detection.

## 10. Duplicate Subscription and Overlap Detection

Duplicate detection is not simply a text comparison of vendor names.

### 10.1 Duplicate subscription signals

Identify candidates using evidence such as:

- Same vendor and product
- Matching external subscription identifiers
- Same account or billing entity
- Overlapping billing periods
- Similar plan metadata
- Matching invoice references
- Repeated invoice line items
- Repeated internal ownership or cost-center information

Exact duplicate identifiers provide stronger evidence than matching names alone.

### 10.2 Duplicate classification

Classify candidates as:

- Confirmed duplicate
- Likely duplicate
- Potential overlap
- Insufficient evidence

An exact duplicate import record should be treated differently from two legitimate subscriptions owned by different departments.

### 10.3 Capability overlap

Different products may provide overlapping capabilities without being financially or operationally interchangeable.

Use capability overlap as an investigation signal, not proof that a subscription should be canceled.

For example, two tools may both provide AI assistance while serving different security, model, workflow, or governance requirements.

### 10.4 Recommendation evidence

A duplicate or overlap recommendation should include:

- Candidate subscriptions
- Evidence used
- Areas of similarity
- Differences that may explain separate purchases
- Current cost of each subscription
- Relevant ownership or usage data
- Potential savings range where justified
- Required verification before cancellation

Never automatically cancel a subscription because a text similarity score is high.

## 11. AI API Spend Analytics

AI usage may involve multiple providers, models, pricing units, and account structures. The platform must preserve those distinctions.

### 11.1 Usage data

Where available, ingest:

- Provider
- Account or project identifier
- Model identifier
- Usage timestamp
- Input tokens
- Output tokens
- Cached token quantities
- API request count
- Billable units
- Reported cost
- Currency
- Source billing period

Only ingest individual metrics that the provider actually exposes.

Do not assume every provider exposes token-level billing, organization-level attribution, cached token counts, or cost information at the same granularity.

### 11.2 Model-level cost reporting

Provide views by:

- Provider
- Model
- Project or application
- Time period
- Cost category
- Environment, if available
- Team or owner, if attribution exists

Avoid guessing which internal project generated a bill when the provider data does not support that attribution.

### 11.3 Cost anomalies

Detect unusual spending changes using transparent methods, such as:

- Increase compared with a previous equivalent period
- Consumption beyond a configured budget
- Unusual cost per request
- Sudden usage growth
- Unexpected model or provider mix changes
- Cost records arriving outside normal patterns

Use minimum-data requirements to prevent misleading anomaly flags from very small datasets.

### 11.4 Unit economics

Where sufficient data exists, calculate metrics such as:

- Cost per request
- Cost per user
- Cost per successful job
- Cost per workflow
- Cost per project

The denominator and period must be defined. A cost-per-request estimate based on total account usage must not be presented as application-specific if individual request attribution is unavailable.

### 11.5 AI output boundary

Use AI to explain trends, categorize ambiguous descriptions, and summarize evidence where useful.

Core monetary calculations, reconciliation decisions, and duplicate-event handling must be deterministic and testable.

AI must not invent token usage, provider pricing, subscription terms, or savings figures.

## 12. Invoice Ingestion and Reconciliation

Invoice ingestion must be robust enough to handle inconsistent formats while preserving the original evidence.

### 12.1 Supported ingestion paths

Prioritize:

1. CSV or structured file imports.
2. Manual subscription and invoice entry.
3. Supported vendor billing APIs.
4. Invoice PDF or image extraction where required and feasible.

Treat each ingestion path as a separate adapter with its own validation and error-handling rules.

### 12.2 Import workflow

A safe import workflow should:

1. Accept an authorized upload.
2. Validate the file type and size.
3. Store the source securely.
4. Parse the records into a staging area.
5. Normalize vendor, currency, date, and amount fields.
6. Detect duplicate or conflicting records.
7. Show a preview of accepted and rejected records.
8. Allow review or correction where appropriate.
9. Commit approved normalized records.
10. Record the import result and source provenance.

Do not silently discard invalid rows or overwrite existing invoice records without reporting what happened.

### 12.3 Invoice extraction

If an invoice is processed through OCR or an AI model, validate important fields such as:

- Invoice number
- Vendor identity
- Invoice date
- Billing period
- Currency
- Subtotal
- Tax
- Total
- Line-item amounts

Compare extracted line-item sums with the invoice totals according to the document's own calculation conventions.

When totals do not reconcile, flag the invoice for review rather than forcing the numbers to match.

### 12.4 Duplicate invoice detection

Use exact invoice identifiers and vendor scope where possible, supplemented by invoice date, currency, total, and line-item evidence.

Two invoices with similar totals should not automatically be treated as duplicates.

### 12.5 Reconciliation rules

Compare imported invoices against available subscription and usage records.

Examples:

- Invoice amount differs from the expected plan cost.
- Seat count appears inconsistent with the billing record.
- Renewal price has increased.
- A subscription has a new charge after an expected cancellation.
- A cost record cannot be matched to a known subscription.
- An invoice total differs from the normalized line-item totals.

The system should label a discrepancy as detected, under review, resolved, or unresolved.

Do not assume that a difference proves an overcharge. Taxes, discounts, prorated terms, foreign exchange, credits, and billing-period differences may explain it.

### 12.6 Import security

- Validate file size and supported formats.
- Reject unexpected executable or unsupported content.
- Sanitize displayed invoice text.
- Avoid executing embedded content.
- Keep uploaded records scoped to the owning organization.
- Restrict access to sensitive documents.
- Avoid exposing complete invoice details to unauthorized roles.
- Define retention and deletion rules for uploaded files.

## 13. Recommendation Engine

The recommendation engine should prioritize financial correctness and transparent reasoning over generating a large number of suggestions.

### 13.1 Rules-first architecture

Implement deterministic rules for the main financial analyses.

Examples:

- Paid seats that are unassigned.
- Eligible inactive seats with sufficient usage evidence.
- Potential duplicate subscriptions supported by strong matching evidence.
- Pricing-tier comparisons with complete pricing information.
- Renewals with a verified upcoming date.
- Invoice discrepancies.
- Unexpected spending increases.
- AI usage costs exceeding a configured budget.

Rules should be individually testable and versioned.

### 13.2 Recommendation structure

Each recommendation should contain:

- Title
- Description
- Category
- Severity or priority
- Relevant vendor and subscription
- Evidence references
- Calculation method
- Financial assumptions
- Expected implementation action
- Potential savings estimate
- Estimate confidence
- Data freshness
- Limitations
- Recommended review date, where relevant

### 13.3 Pricing-plan comparison

When comparing plans:

1. Gather the current plan's known pricing terms.
2. Gather the candidate plan's verified pricing terms.
3. Determine the relevant seat count and usage period.
4. Account for included quota, tiering, overages, and contract terms where supported.
5. Calculate the expected current and alternative costs.
6. Present the assumptions and missing information.
7. Identify any functional or contractual considerations that need human review.

Do not recommend a cheaper plan solely because its advertised base price is lower. The actual cost depends on the organization's usage and contractual terms.

### 13.4 Savings calculation

Use a transparent formula appropriate to the recommendation.

For a basic comparable recurring charge:

\[
\text{Estimated Monthly Savings}
=
\text{Current Normalized Monthly Cost}
-
\text{Alternative Normalized Monthly Cost}
\]

For an annual commitment:

\[
\text{Estimated Annual Savings}
=
\text{Expected Annual Cost Before Action}
-
\text{Expected Annual Cost After Action}
\]

These comparisons must use equivalent scope, usage assumptions, currencies, and periods.

Where relevant, subtract required implementation costs, cancellation penalties, or unavoidable remaining contract commitments.

If an input is unknown, present a range or state that a reliable estimate cannot yet be calculated.

### 13.5 Gross versus net savings

Distinguish:

- Gross projected savings
- One-time implementation cost
- Contractual cancellation cost
- Net projected savings
- Verified realized savings

Do not combine projected savings and realized savings into a single metric.

### 13.6 Recommendation priority

Prioritize recommendations using factors such as:

- Potential net savings
- Confidence in the evidence
- Data completeness
- Urgency of renewal or budget pressure
- Implementation effort
- Business and security risk
- Contractual constraints

Do not rank recommendations by savings amount alone. A recommendation that saves money but creates unacceptable security or operational risk should be escalated rather than presented as a default action.

### 13.7 AI-assisted explanation

An optional AI layer can:

- Summarize cost trends.
- Explain why a deterministic rule triggered.
- Categorize ambiguous product descriptions.
- Draft a business justification.
- Produce an executive summary.
- Suggest investigation questions.

The AI layer must reference existing evidence and avoid inventing facts.

If the AI provider is unavailable, use deterministic descriptions or templates so the platform remains useful.

## 14. Recommendation Lifecycle and Realized Savings

### 14.1 Lifecycle

Use an explicit recommendation lifecycle:

`new → under_review → approved → in_progress → implemented → verified`

Alternative outcomes may include:

`rejected`, `deferred`, `not_realized`

Do not mark a recommendation implemented solely because a user clicked an action button.

### 14.2 Review and approval

Users with the appropriate permissions should be able to:

- Review recommendation evidence.
- Examine calculation assumptions.
- Ask for missing information.
- Approve or reject the recommendation.
- Assign an implementation owner.
- Record an expected completion date.
- Capture implementation notes.
- Track verification results.

The initial release should recommend actions rather than automatically canceling subscriptions or reducing user access.

### 14.3 Savings verification

For a cost-reduction action, compare a defined baseline period with an appropriate post-action period.

Account for:

- Changes in usage
- Seat counts
- Subscription plan
- Billing interval
- Currency conversion
- Discounts or credits
- Seasonality where meaningful
- Contractual commitments
- Differences in the scope of measured services

The platform must distinguish a reduction in vendor spending from a verified saving caused by the recommendation. A lower invoice might result from reduced usage or a billing adjustment rather than the optimization action.

### 14.4 Audit history

Record important recommendation decisions, including:

- Who reviewed the opportunity.
- Which assumptions were approved.
- Who implemented the change.
- When the change occurred.
- How the saving was calculated.
- Which source records support the outcome.
- Who verified the realized result.

Preserve the original recommendation and its calculation version so later analyses do not silently rewrite previous decisions.

## 15. Dashboard and User Experience

### 15.1 Executive dashboard

Display:

- Actual spending for the selected period.
- Normalized recurring monthly spend.
- Annualized recurring commitment.
- Spending trends.
- Spend by vendor and category.
- Potential savings awaiting review.
- Verified realized savings.
- Upcoming renewals.
- Unexpected cost increases.
- Reconciliation discrepancies.
- Data freshness and integration status.

Every metric should have a defined period and data source.

Do not present potential savings as money already saved.

### 15.2 Vendor and subscription views

Allow users to:

- Search vendor and product names.
- Filter by category.
- Sort by cost, renewal, utilization, or status.
- Open subscription details.
- Compare source invoices against expected plan cost.
- Review license counts and usage.
- Identify missing data.
- View relevant recommendations.

### 15.3 AI cost explorer

Provide filters by provider, model, time period, project, or other available attribution fields.

Display cost trends and usage metrics only when the source supports the required granularity.

Allow users to inspect the underlying data behind aggregate charts.

### 15.4 Recommendation workspace

Each recommendation should have a dedicated detail view showing:

- The problem being identified.
- The evidence that supports it.
- The calculation and assumptions.
- Expected savings.
- Potential operational impact.
- Implementation steps.
- Approval status.
- Follow-up and verification results.

Use clear, non-technical explanations for finance users while preserving detailed calculations for engineering teams.

### 15.5 Import and integration experience

Display:

- Connected source.
- Last successful sync.
- Last attempted sync.
- Records imported.
- Records rejected.
- Duplicate records detected.
- Reconciliation errors.
- Required corrective actions.

Clearly label manual data, imported data, API-sourced data, estimated values, and unverified information.

### 15.6 Accessibility and usability

Support:

- Keyboard navigation.
- Accessible labels for filters and controls.
- Readable tables and financial figures.
- Clear loading and failure states.
- Responsive layouts.
- Consistent currency and date formatting.
- Explanation of missing or stale data.
- Useful empty states when no integrations are connected.

Do not hide material assumptions behind tooltips that are difficult to find. Financial decisions require visible explanation of how important figures were calculated.

## 16. API Design

Expose a versioned API under `/api/v1`.

### 16.1 Vendors and subscriptions

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/vendors` | List authorized vendors |
| POST | `/api/v1/vendors` | Create a vendor record |
| GET | `/api/v1/subscriptions` | List and filter subscriptions |
| POST | `/api/v1/subscriptions` | Create a subscription |
| GET | `/api/v1/subscriptions/:subscriptionId` | Retrieve subscription details |
| PATCH | `/api/v1/subscriptions/:subscriptionId` | Update permitted subscription fields |
| GET | `/api/v1/subscriptions/:subscriptionId/licenses` | Retrieve license allocation data |
| GET | `/api/v1/subscriptions/:subscriptionId/usage` | Retrieve supported usage records |

### 16.2 Imports and integrations

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/integrations` | List authorized integration statuses |
| POST | `/api/v1/integrations/:provider/connect` | Initiate a supported connection flow |
| POST | `/api/v1/integrations/:integrationId/sync` | Start a permitted sync |
| POST | `/api/v1/imports` | Create an import job |
| GET | `/api/v1/imports/:importId` | Retrieve import status |
| GET | `/api/v1/imports/:importId/errors` | Retrieve import errors |
| POST | `/api/v1/imports/:importId/commit` | Commit eligible reviewed records |

Implement provider connection and synchronization endpoints only for the adapters that exist. External authorization flows must follow the provider's actual security contract.

### 16.3 Invoices and cost analysis

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/invoices` | List invoices |
| POST | `/api/v1/invoices` | Import or record an invoice |
| GET | `/api/v1/invoices/:invoiceId` | Retrieve an invoice |
| GET | `/api/v1/costs/summary` | Retrieve normalized spend summaries |
| GET | `/api/v1/costs/trends` | Retrieve period-based cost trends |
| GET | `/api/v1/costs/by-vendor` | Aggregate spend by vendor |
| GET | `/api/v1/costs/ai-usage` | Retrieve supported AI usage analytics |
| POST | `/api/v1/analysis/run` | Start a cost optimization analysis |
| GET | `/api/v1/analysis/:analysisId` | Retrieve analysis status and result |

### 16.4 Recommendations and outcomes

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/recommendations` | List recommendations |
| GET | `/api/v1/recommendations/:recommendationId` | Retrieve recommendation details |
| PATCH | `/api/v1/recommendations/:recommendationId` | Update permitted review fields |
| POST | `/api/v1/recommendations/:recommendationId/approve` | Approve a recommendation |
| POST | `/api/v1/recommendations/:recommendationId/reject` | Reject a recommendation |
| POST | `/api/v1/recommendations/:recommendationId/implement` | Record an implementation action |
| POST | `/api/v1/recommendations/:recommendationId/verify` | Record a savings verification outcome |

### 16.5 API contract requirements

Every endpoint must define:

- Authentication and authorization requirements.
- Request and response schemas.
- Valid status transitions.
- Supported filters and pagination.
- Input length and range constraints.
- Error codes and HTTP status codes.
- Idempotency behavior where relevant.
- Financial calculation conventions.
- Provenance fields where appropriate.

Validate all user-controlled inputs on the server.

Do not let a client submit an arbitrary savings value and have it stored as a verified outcome without the required evidence and authorization.

### 16.6 Error responses

Use a consistent error structure with a stable code, human-readable message, and request ID where appropriate.

Distinguish validation failures, access denials, missing or concealed resources, conflicting updates, rate limits, ingestion failures, and unexpected server errors.

Do not expose credentials, source file contents, stack traces, or sensitive vendor configuration in errors.

### 16.7 API documentation

Maintain OpenAPI 3.x documentation for implemented endpoints, including examples for import validation errors, reconciliation discrepancies, pricing comparisons, and recommendation lifecycle transitions.

Keep the documentation synchronized with the actual API rather than treating a drafted schema as evidence that an endpoint is working.

## 17. Security, Privacy, and Data Governance

### 17.1 Organization isolation

- Scope financial records to the requesting organization.
- Enforce access checks on every protected endpoint.
- Prevent cross-organization access through modified IDs.
- Apply access controls to uploaded invoices and exported reports.
- Prevent background jobs from processing data under the wrong organization context.
- Enforce permissions for integration setup and sensitive cost data.

### 17.2 Integration credentials

- Store credentials using a suitable secret manager or encrypted server-side mechanism.
- Never expose vendor API keys to the browser.
- Redact credentials from logs and error responses.
- Limit integration permissions to the minimum scopes needed.
- Support revocation or disconnection through the provider's supported mechanisms.
- Protect against accidental credential reuse across organizations.

### 17.3 File ingestion

- Validate uploaded file types and sizes.
- Parse supported files safely.
- Avoid executing embedded content or formulas.
- Sanitize rendered text extracted from invoices.
- Restrict access to source documents.
- Ensure imports do not create cross-organization records.

For spreadsheet exports, protect cells containing user-controlled data from being interpreted as unintended formulas by spreadsheet software.

### 17.4 AI privacy

If invoice content, subscription details, or usage records are sent to an external AI service:

- Disclose the intended processing behavior.
- Send only the minimum necessary information.
- Avoid sending credentials or unrelated customer data.
- Validate returned output.
- Do not allow AI output to bypass authorization.
- Document relevant provider retention terms accurately.
- Provide a deterministic fallback for supported rules and calculations.

Do not claim that data is never retained by an AI provider unless the actual provider terms and configuration support that claim.

### 17.5 Auditability

Audit important operations, including:

- Integration creation and removal.
- Manual data corrections.
- Invoice imports.
- Changes to subscription metadata.
- Changes to seat counts.
- Recommendation approval and rejection.
- Implementation and verification of savings.
- Financial report exports.
- Sensitive permission changes.

Keep audit metadata useful without logging unnecessary secrets or complete invoice contents.

## 18. Reliability and Data Quality

### 18.1 Idempotent imports

Repeatedly importing the same source must not create duplicate invoices, duplicate cost entries, or double-counted usage.

Use stable provider identifiers where available. For files without unique identifiers, combine documented matching signals and require review when matching is uncertain.

Do not automatically collapse records merely because the amounts and dates are similar.

### 18.2 Source freshness

Track the last successful retrieval time and source period for connected data.

A stale usage export should not silently support a current inactive-seat recommendation.

Display freshness warnings and, where appropriate, prevent a recommendation from being marked high-confidence until the data is refreshed.

### 18.3 Partial import failures

Support explicit import outcomes such as:

- Completed successfully
- Completed with row errors
- Failed
- Cancelled

Preserve the distinction between accepted and rejected rows.

Use a staging-and-review approach where partial ingestion could otherwise create an inaccurate financial picture.

### 18.4 Reconciliation workflow

Reconciliation should identify disagreements between source records without assuming the normalized database is always correct.

For each discrepancy, preserve:

- Source record references.
- Expected value.
- Observed value.
- Difference.
- Currency and period.
- Matching method.
- Review status.
- Resolution notes.

Correct the underlying data only through an authorized process that preserves provenance.

### 18.5 Background processing

For imports and long-running analysis:

- Use bounded job execution.
- Make retry behavior explicit.
- Avoid duplicate processing.
- Record progress and outcomes.
- Protect jobs with organization-scoped authorization.
- Provide a recoverable state after a worker failure.
- Avoid unbounded retries on permanent validation or credential errors.

## 19. Testing Strategy

Testing must validate not only the displayed dashboards but the correctness of the financial data, assumptions, calculations, and recommendation lifecycle.

### 19.1 Unit tests

Test:

- Monthly and annual cost normalization.
- Currency handling.
- Exact monetary arithmetic.
- Pricing-tier calculations.
- Included usage and overage calculations.
- Seat assignment and activity metrics.
- Duplicate-matching rules.
- Savings estimates.
- Confidence and priority rules.
- Recommendation state transitions.
- Source freshness evaluation.
- Import schema validation.

### 19.2 Integration tests

Use a real test database or an equivalent environment that verifies actual constraints and query behavior.

Test:

- Subscription creation and updates.
- Invoice ingestion and persistence.
- Duplicate invoice detection.
- Usage record normalization.
- Cost aggregation by period.
- Pricing comparison.
- Recommendation generation.
- Source-record provenance.
- Recommendation approval and rejection.
- Savings verification.
- Organization isolation.
- Retrying failed imports.

### 19.3 Financial correctness tests

Create fixtures with known costs, billing intervals, currency, seat counts, and usage quantities.

Verify:

- Monthly equivalents.
- Annualized totals.
- Cost by vendor.
- Cost by subscription.
- Actual invoiced totals.
- Forecast cost.
- Potential savings.
- Verified realized savings.
- Currency conversion using an explicit stored rate.
- Partial and duplicate invoice handling.

Include edge cases such as zero seats, missing usage, negative adjustments where legitimate, tax inclusion, prorated charges, and different billing periods.

### 19.4 Recommendation tests

Verify that:

1. An unassigned-seat recommendation is generated only when reliable seat and price data is available.
2. Missing activity data does not produce a false claim that a user is inactive.
3. Duplicate matching does not merge legitimate separate subscriptions without sufficient evidence.
4. A cheaper plan recommendation uses compatible pricing terms and usage assumptions.
5. Incomplete pricing data leads to a disclosed limitation.
6. Savings calculations are reproducible from the evidence.
7. A rejected recommendation is not counted as realized savings.
8. An implemented recommendation is not automatically marked verified.
9. A stale source lowers confidence or triggers a review requirement where configured.
10. An AI-generated explanation cannot override the deterministic calculation.

### 19.5 Security tests

Test:

- Cross-organization data access.
- Unauthorized report exports.
- Unauthorized integration management.
- Exposure of vendor credentials.
- Access to uploaded invoices.
- Malicious or malformed import files.
- API requests attempting to overwrite protected fields.
- Prompt-injection-like content in imported notes or invoices if AI processing is used.
- Leakage of private data through AI-generated reports.
- Access control on recommendation approval and realized-savings verification.

### 19.6 End-to-end tests

Using Playwright or an equivalent tool, verify:

1. An Admin creates a subscription manually.
2. An authorized user imports an invoice file.
3. The platform displays accepted, rejected, and duplicate rows.
4. A reviewer resolves an import discrepancy.
5. The cost dashboard reflects the committed records.
6. A supported usage import produces the expected analytics.
7. The recommendation engine detects a known test opportunity.
8. The user opens the evidence and verifies the savings calculation.
9. The user approves and records an implementation action.
10. The user records a savings verification result.
11. A Viewer cannot change the recommendation's approval or outcome.
12. A user from another organization cannot access the subscription, invoice, or report.
13. A failed integration sync produces a visible diagnostic state rather than silently reporting fresh data.

Use deterministic test adapters for automated tests. Mocked provider data validates application behavior, not actual vendor API compatibility or pricing accuracy.

## 20. CI/CD and Release Gates

### 20.1 Continuous integration checks

Run the relevant checks for code changes:

- Linting.
- Type checking.
- Unit tests.
- Schema validation.
- Financial calculation tests.
- Integration tests.
- Critical authorization tests.
- Selected end-to-end tests.
- Production build verification.

Run broader integration and regression suites on release candidates or an appropriate schedule when necessary, while keeping critical data-integrity and security checks in the required release path.

### 20.2 Release gates

A release should be blocked when:

- Critical financial calculations fail.
- Duplicate ingestion can materially double-count costs.
- Cross-organization access controls fail.
- Integration secrets are exposed.
- Deterministic savings calculations cannot be reproduced.
- Required migration or build checks fail.
- Critical reconciliation or authorization tests are unexplained or skipped.

Document approved exceptions with the issue, risk, mitigation, approver, and follow-up requirements.

Do not declare a release successful solely because most tests passed.

## 21. Implementation Roadmap

### Phase 1: Foundation and Organization Security

- Inspect the existing repository and current application architecture.
- Establish authentication and organization boundaries.
- Define the initial data model and migrations.
- Add vendor, subscription, invoice, and usage entities.
- Implement input validation and API error handling.
- Add organization-isolation tests.

**Exit criterion:** The application stores organization-scoped subscription and invoice data safely.

### Phase 2: Manual Entry and File Ingestion

- Implement vendor and subscription management.
- Add CSV or structured file imports.
- Build the staging-and-preview workflow.
- Implement validation and duplicate detection.
- Record import status and source provenance.
- Add invoice storage and access controls.

**Exit criterion:** Users can build an auditable subscription inventory from manually entered or imported records.

### Phase 3: Spend Normalization and Dashboard

- Implement normalized recurring-cost calculations.
- Separate actual invoice amounts from estimated monthly equivalents.
- Add vendor and category breakdowns.
- Build spending trends and renewal views.
- Display data freshness and missing information.
- Add financial calculation tests.

**Exit criterion:** Dashboard metrics are reproducible from persisted source records and explicit calculations.

### Phase 4: Seat and Usage Analytics

- Implement license assignment records.
- Add supported usage ingestion.
- Build seat-utilization metrics.
- Add AI usage analytics where source data exists.
- Implement budget and anomaly rules.
- Clearly distinguish missing usage from zero usage.

**Exit criterion:** Users can evaluate available utilization and usage data without unsupported assumptions.

### Phase 5: Reconciliation and Recommendations

- Implement invoice-to-subscription matching.
- Add cost discrepancy detection.
- Implement duplicate and overlap rules.
- Add pricing-plan comparison.
- Build savings calculations and confidence indicators.
- Store recommendation evidence and assumptions.

**Exit criterion:** Recommendations can be traced to the underlying source records and reproduced by deterministic tests.

### Phase 6: AI-Assisted Explanations

- Add the provider-agnostic AI adapter.
- Implement evidence-grounded summaries.
- Add controlled classification of ambiguous vendor descriptions.
- Validate generated output.
- Add rate limits, timeouts, and fallback templates.
- Verify that AI output cannot modify authoritative cost calculations.

**Exit criterion:** AI improves explanation and investigation without becoming the source of financial truth.

### Phase 7: Review and Savings Verification

- Implement recommendation lifecycle states.
- Add approval and rejection workflows.
- Record implementation owners and actions.
- Add realized-savings verification.
- Build outcome reporting.
- Add audit and role-based controls.

**Exit criterion:** The platform distinguishes potential savings from verified outcomes and records the decisions behind them.

### Phase 8: Hardening and Release

- Run the complete unit, integration, security, and end-to-end test suites.
- Test duplicate imports and reconciliation edge cases.
- Review financial precision and currency handling.
- Verify integration failure recovery.
- Document deployment, retention, and operational behavior.
- Produce the final verification report.

**Exit criterion:** Critical workflows are tested, financial calculations are reproducible, and known limitations are documented.

## 22. Acceptance Criteria

### Data consolidation

- Users can manage vendors and subscriptions.
- Supported file imports validate and normalize records.
- Duplicate imports do not silently double-count costs.
- Every normalized record has traceable source information.
- Data freshness and ingestion failures are visible.

### Financial analytics

- Actual invoices remain distinct from estimates and forecasts.
- Recurring costs are normalized using documented rules.
- Currency conversions use an explicit exchange-rate source and date.
- AI and SaaS cost summaries can be reproduced from stored records.
- Seat and usage calculations distinguish missing information from zero values.

### Optimization recommendations

- Duplicate and overlap recommendations show evidence.
- Seat recommendations use available activity and pricing data.
- Plan comparisons use equivalent time periods and usage assumptions.
- Potential savings calculations are deterministic and explainable.
- Recommendations cannot be marked as verified savings without an authorized outcome record and the defined verification evidence.

### Security and auditability

- Organization-level data isolation is enforced.
- Integration secrets remain server-side.
- Sensitive invoices and reports have appropriate access controls.
- Important financial changes and recommendation decisions are auditable.
- AI-generated content cannot override authorization or financial rules.

### Engineering quality

- Database migrations run from a clean environment.
- API contracts match the implementation.
- Unit, integration, security, financial, and end-to-end tests cover critical behavior.
- Build and deployment instructions are documented.
- Actual verification results and known gaps are reported honestly.

## 23. README and Developer Documentation

Document:

- Project purpose and features.
- Architecture and data flow.
- Technology stack.
- Prerequisites and local setup.
- Environment variables.
- Database schema and migration commands.
- Import formats and normalization rules.
- Financial calculation conventions.
- Currency conversion behavior.
- Supported integration capabilities.
- AI data-processing behavior.
- Recommendation evidence and savings calculations.
- API documentation.
- Test commands.
- Deployment instructions.
- Data retention and deletion policies.
- Known limitations and future improvements.

Use placeholders for secrets in `.env.example`. Never commit actual provider credentials, production database URLs, or sensitive invoice data.

## 24. Final Verification Report

At completion, produce a factual report containing:

| Area | Required evidence |
|---|---|
| Vendor inventory | Creation, update, and source tracking |
| Imports | Supported formats, validation, and duplicate handling |
| Spend normalization | Calculation methods and test results |
| Seat utilization | Metrics, source limitations, and validation |
| AI spend | Supported fields and calculation accuracy |
| Reconciliation | Discrepancy detection and review results |
| Recommendations | Evidence, assumptions, and savings calculations |
| Realized savings | Verification process and actual recorded outcomes |
| Security | Organization isolation and permission-test results |
| AI integration | Actual provider status or test-adapter limitations |
| Testing | Commands executed and their results |
| Deployment | Actual deployment status and required configuration |
| Final status | Ready for submission, blocked, or incomplete, with evidence |

Clearly distinguish between implemented, tested, planned, and unverified features. Do not claim that a recommendation created realized savings unless the outcome has been measured and supported by the defined evidence.

## Final Execution Instruction

Inspect the existing repository before making changes. Preserve working functionality unless a change is necessary and justified. Implement the platform incrementally, prioritizing reliable source ingestion, financial correctness, transparent calculations, organization-level security, and evidence-based recommendations.

Treat every external data source as potentially incomplete or inconsistent. Preserve source provenance, validate imports, prevent duplicate counting, and distinguish actual charges from estimated costs.

Prioritize deterministic rules for cost calculations, seat utilization, duplicate detection, reconciliation, and savings estimation. Use AI to improve classification and explanations only when its output can be validated against available evidence.

Do not assume that a vendor offers a particular API or exposes detailed seat activity. Do not invent contract terms, pricing figures, exchange rates, usage metrics, or savings. Mark unavailable information as unknown and make assumptions visible.

Before declaring completion, execute the available linting, type-checking, build, migration, unit, integration, security, financial-calculation, and end-to-end test commands. Verify that recommendations can be reproduced from the persisted evidence and that users cannot access another organization's financial records.

Report test results, integration limitations, unresolved discrepancies, and deployment status honestly.

The final deliverable must enable teams to understand their software spending, identify credible optimization opportunities, justify cost-reduction decisions with evidence, and measure whether the resulting savings were actually realized.