import { Prisma, SourceType, ImportJobStatus, BillingInterval, SubscriptionStatus, InvoiceStatus, SeatStatus, CostType } from "@prisma/client";
import prisma from "../prisma";
import { parseCsvText, SubscriptionCsvRowSchema, InvoiceCsvRowSchema, UsageCsvRowSchema, LicenseCsvRowSchema } from "./csv-parser";
import { Decimal, toDecimal } from "../financial/decimal";
import { normalizeRecurringCost } from "../financial/normalization";
import { createAuditLog } from "../audit/logger";

export interface StagedItem {
  rowNumber: number;
  status: "VALID" | "INVALID" | "DUPLICATE";
  raw: Record<string, string>;
  normalized?: Record<string, unknown>;
  errors?: string[];
  duplicateReason?: string;
}

export interface StagingSummary {
  jobId: string;
  sourceType: SourceType;
  rowCount: number;
  acceptedCount: number;
  rejectedCount: number;
  duplicateCount: number;
  stagedItems: StagedItem[];
}

export async function stageImportFile(params: {
  organizationId: string;
  userId?: string;
  sourceType: SourceType;
  fileName: string;
  fileContent: string;
}): Promise<StagingSummary> {
  const { organizationId, userId, sourceType, fileName, fileContent } = params;

  const rawRows = parseCsvText(fileContent);
  const stagedItems: StagedItem[] = [];
  let accepted = 0;
  let rejected = 0;
  let duplicate = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const rowNumber = i + 1;

    try {
      if (sourceType === SourceType.CSV_SUBSCRIPTIONS) {
        // Map common raw field names
        const mapped = {
          vendorName: raw.vendorname || raw.vendor || "",
          productName: raw.productname || raw.product || "",
          planName: raw.planname || raw.plan || "Standard",
          billingInterval: (raw.billinginterval || raw.interval || "MONTHLY").toUpperCase(),
          billingCurrency: (raw.billingcurrency || raw.currency || "USD").toUpperCase(),
          expectedAmount: raw.expectedamount || raw.amount || raw.cost || "0",
          renewalDate: raw.renewaldate || raw.renewal || null,
          contractEndDate: raw.contractenddate || null,
          seatQuantity: raw.seatquantity || raw.seats || null,
          ownerEmail: raw.owneremail || raw.owner || null,
          externalSubscriptionId: raw.externalsubscriptionid || raw.id || null,
        };

        const parsed = SubscriptionCsvRowSchema.safeParse(mapped);
        if (!parsed.success) {
          rejected++;
          stagedItems.push({
            rowNumber,
            status: "INVALID",
            raw,
            errors: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          });
          continue;
        }

        // Check for duplicate subscription
        const existingSub = await prisma.subscription.findFirst({
          where: {
            organizationId,
            productName: { equals: parsed.data.productName, mode: "insensitive" },
            vendor: { name: { equals: parsed.data.vendorName, mode: "insensitive" } },
            status: { notIn: [SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED] },
          },
        });

        if (existingSub) {
          duplicate++;
          stagedItems.push({
            rowNumber,
            status: "DUPLICATE",
            raw,
            duplicateReason: `Active subscription for ${parsed.data.vendorName} - ${parsed.data.productName} already exists (ID: ${existingSub.id})`,
            normalized: parsed.data,
          });
        } else {
          accepted++;
          stagedItems.push({
            rowNumber,
            status: "VALID",
            raw,
            normalized: parsed.data,
          });
        }
      } else if (sourceType === SourceType.CSV_INVOICES) {
        const mapped = {
          invoiceNumber: raw.invoicenumber || raw.invoiceno || raw.id || "",
          vendorName: raw.vendorname || raw.vendor || "",
          invoiceDate: raw.invoicedate || raw.date || "",
          billingPeriodStart: raw.billingperiodstart || raw.startdate || null,
          billingPeriodEnd: raw.billingperiodend || raw.enddate || null,
          currency: (raw.currency || "USD").toUpperCase(),
          subtotal: raw.subtotal || raw.amount || null,
          tax: raw.tax || "0",
          total: raw.total || raw.totalamount || raw.amount || "0",
          status: (raw.status || "PAID").toUpperCase(),
          description: raw.description || "Subscription Service Charge",
        };

        const parsed = InvoiceCsvRowSchema.safeParse(mapped);
        if (!parsed.success) {
          rejected++;
          stagedItems.push({
            rowNumber,
            status: "INVALID",
            raw,
            errors: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          });
          continue;
        }

        // Check for duplicate invoice in organization
        const existingInvoice = await prisma.invoice.findFirst({
          where: {
            organizationId,
            invoiceNumber: parsed.data.invoiceNumber,
            vendor: { name: { equals: parsed.data.vendorName, mode: "insensitive" } },
          },
        });

        if (existingInvoice) {
          duplicate++;
          stagedItems.push({
            rowNumber,
            status: "DUPLICATE",
            raw,
            duplicateReason: `Invoice #${parsed.data.invoiceNumber} for ${parsed.data.vendorName} already exists in database`,
            normalized: parsed.data,
          });
        } else {
          accepted++;
          stagedItems.push({
            rowNumber,
            status: "VALID",
            raw,
            normalized: parsed.data,
          });
        }
      } else if (sourceType === SourceType.CSV_USAGE) {
        const mapped = {
          vendorName: raw.vendorname || raw.vendor || "",
          metricName: raw.metricname || raw.metric || "",
          quantity: raw.quantity || raw.count || "0",
          unit: raw.unit || "units",
          usageStartAt: raw.usagestartat || raw.startdate || raw.date || "",
          usageEndAt: raw.usageendat || raw.enddate || raw.date || "",
          reportedCost: raw.reportedcost || raw.cost || null,
          modelIdentifier: raw.modelidentifier || raw.model || null,
          projectIdentifier: raw.projectidentifier || raw.project || null,
        };

        const parsed = UsageCsvRowSchema.safeParse(mapped);
        if (!parsed.success) {
          rejected++;
          stagedItems.push({
            rowNumber,
            status: "INVALID",
            raw,
            errors: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          });
          continue;
        }

        accepted++;
        stagedItems.push({
          rowNumber,
          status: "VALID",
          raw,
          normalized: parsed.data,
        });
      } else if (sourceType === SourceType.CSV_LICENSES) {
        const mapped = {
          productName: raw.productname || raw.product || "",
          externalIdentity: raw.externalidentity || raw.email || raw.user || "",
          seatStatus: (raw.seatstatus || raw.status || "ASSIGNED").toUpperCase(),
          assignedAt: raw.assignedat || null,
          lastActivityAt: raw.lastactivityat || raw.lastactive || null,
        };

        const parsed = LicenseCsvRowSchema.safeParse(mapped);
        if (!parsed.success) {
          rejected++;
          stagedItems.push({
            rowNumber,
            status: "INVALID",
            raw,
            errors: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          });
          continue;
        }

        accepted++;
        stagedItems.push({
          rowNumber,
          status: "VALID",
          raw,
          normalized: parsed.data,
        });
      } else {
        rejected++;
        stagedItems.push({
          rowNumber,
          status: "INVALID",
          raw,
          errors: [`Unsupported sourceType '${sourceType}'`],
        });
      }
    } catch (err: unknown) {
      rejected++;
      stagedItems.push({
        rowNumber,
        status: "INVALID",
        raw,
        errors: [(err as Error).message || "Parse error"],
      });
    }
  }

  // Create ImportJob record in PostgreSQL
  const job = await prisma.importJob.create({
    data: {
      organizationId,
      sourceType,
      status: ImportJobStatus.PROCESSING,
      originalFileName: fileName,
      rowCount: rawRows.length,
      acceptedCount: accepted,
      rejectedCount: rejected,
      duplicateCount: duplicate,
      stagingData: stagedItems as unknown as Prisma.InputJsonValue,
      createdById: userId || null,
      startedAt: new Date(),
    },
  });

  return {
    jobId: job.id,
    sourceType,
    rowCount: rawRows.length,
    acceptedCount: accepted,
    rejectedCount: rejected,
    duplicateCount: duplicate,
    stagedItems,
  };
}

export async function commitImportJob(jobId: string, organizationId: string, userId?: string) {
  const job = await prisma.importJob.findFirst({
    where: { id: jobId, organizationId },
  });

  if (!job) {
    throw new Error("Import job not found or unauthorized");
  }

  if (job.status === ImportJobStatus.COMPLETED) {
    throw new Error("Import job has already been committed");
  }

  const stagedItems = (job.stagingData as unknown as StagedItem[]) || [];
  const validItems = stagedItems.filter((item) => item.status === "VALID" && item.normalized);

  let committedRecords = 0;

  for (const item of validItems) {
    const data = item.normalized!;

    if (job.sourceType === SourceType.CSV_SUBSCRIPTIONS) {
      const vendorName = String(data.vendorName).trim();
      let vendor = await prisma.vendor.findFirst({
        where: {
          organizationId,
          name: { equals: vendorName, mode: "insensitive" },
        },
      });

      if (!vendor) {
        vendor = await prisma.vendor.create({
          data: {
            organizationId,
            name: vendorName,
            category: "General SaaS",
            billingCurrency: String(data.billingCurrency || "USD"),
          },
        });
      }

      let ownerId: string | undefined = undefined;
      if (data.ownerEmail) {
        const ownerUser = await prisma.user.findUnique({
          where: { email: String(data.ownerEmail).toLowerCase() },
        });
        if (ownerUser) ownerId = ownerUser.id;
      }

      const expectedAmount = new Decimal(String(data.expectedAmount));
      const interval = (data.billingInterval as BillingInterval) || BillingInterval.MONTHLY;

      const sub = await prisma.subscription.create({
        data: {
          organizationId,
          vendorId: vendor.id,
          productName: String(data.productName),
          planName: String(data.planName || "Standard"),
          billingInterval: interval,
          billingCurrency: String(data.billingCurrency || "USD"),
          expectedAmount,
          renewalAt: data.renewalDate ? new Date(String(data.renewalDate)) : null,
          contractEndAt: data.contractEndDate ? new Date(String(data.contractEndDate)) : null,
          seatQuantity: data.seatQuantity ? parseInt(String(data.seatQuantity), 10) : null,
          ownerId,
          status: SubscriptionStatus.ACTIVE,
          sourceType: SourceType.CSV_SUBSCRIPTIONS,
          sourceReference: `ImportJob:${job.id}:row:${item.rowNumber}`,
        },
      });

      // Create NormalizedCostRecord
      const norm = normalizeRecurringCost(expectedAmount, interval);
      await prisma.normalizedCostRecord.create({
        data: {
          organizationId,
          vendorId: vendor.id,
          subscriptionId: sub.id,
          amount: expectedAmount,
          currency: String(data.billingCurrency || "USD"),
          normalizedMonthlyAmount: norm.normalizedMonthlyAmount,
          costCategory: vendor.category,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          costType: CostType.ESTIMATED_MONTHLY,
          sourceRecordId: sub.id,
        },
      });

      committedRecords++;
    } else if (job.sourceType === SourceType.CSV_INVOICES) {
      const vendorName = String(data.vendorName).trim();
      let vendor = await prisma.vendor.findFirst({
        where: {
          organizationId,
          name: { equals: vendorName, mode: "insensitive" },
        },
      });

      if (!vendor) {
        vendor = await prisma.vendor.create({
          data: {
            organizationId,
            name: vendorName,
            category: "General SaaS",
            billingCurrency: String(data.currency || "USD"),
          },
        });
      }

      const invoiceDate = new Date(String(data.invoiceDate));
      const subtotal = new Decimal(String(data.subtotal || data.total));
      const tax = new Decimal(String(data.tax || 0));
      const total = new Decimal(String(data.total));

      const invoice = await prisma.invoice.create({
        data: {
          organizationId,
          vendorId: vendor.id,
          invoiceNumber: String(data.invoiceNumber),
          currency: String(data.currency || "USD"),
          subtotal,
          tax,
          total,
          invoiceDate,
          billingPeriodStart: data.billingPeriodStart ? new Date(String(data.billingPeriodStart)) : null,
          billingPeriodEnd: data.billingPeriodEnd ? new Date(String(data.billingPeriodEnd)) : null,
          status: (data.status as InvoiceStatus) || InvoiceStatus.PAID,
          sourceType: SourceType.CSV_INVOICES,
          sourceReference: `ImportJob:${job.id}:row:${item.rowNumber}`,
        },
      });

      // Add line item
      await prisma.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          description: String(data.description || "Subscription Charge"),
          amount: total,
          currency: String(data.currency || "USD"),
        },
      });

      // Add NormalizedCostRecord for actual invoiced spend
      await prisma.normalizedCostRecord.create({
        data: {
          organizationId,
          vendorId: vendor.id,
          invoiceId: invoice.id,
          amount: total,
          currency: String(data.currency || "USD"),
          normalizedMonthlyAmount: total,
          costCategory: vendor.category,
          periodStart: invoice.billingPeriodStart || invoiceDate,
          periodEnd: invoice.billingPeriodEnd || invoiceDate,
          costType: CostType.ACTUAL_INVOICE,
          sourceRecordId: invoice.id,
        },
      });

      committedRecords++;
    } else if (job.sourceType === SourceType.CSV_USAGE) {
      const vendorName = String(data.vendorName).trim();
      let vendor = await prisma.vendor.findFirst({
        where: { organizationId, name: { equals: vendorName, mode: "insensitive" } },
      });
      if (!vendor) {
        vendor = await prisma.vendor.create({
          data: {
            organizationId,
            name: vendorName,
            category: "AI API Provider",
            billingCurrency: "USD",
          },
        });
      }

      await prisma.usageRecord.create({
        data: {
          organizationId,
          vendorId: vendor.id,
          metricName: String(data.metricName),
          quantity: new Decimal(String(data.quantity)),
          unit: String(data.unit),
          usageStartAt: new Date(String(data.usageStartAt)),
          usageEndAt: new Date(String(data.usageEndAt)),
          reportedCost: data.reportedCost ? new Decimal(String(data.reportedCost)) : null,
          modelIdentifier: data.modelIdentifier ? String(data.modelIdentifier) : null,
          projectIdentifier: data.projectIdentifier ? String(data.projectIdentifier) : null,
          sourceReference: `ImportJob:${job.id}:row:${item.rowNumber}`,
        },
      });

      committedRecords++;
    } else if (job.sourceType === SourceType.CSV_LICENSES) {
      const productName = String(data.productName).trim();
      const sub = await prisma.subscription.findFirst({
        where: {
          organizationId,
          productName: { equals: productName, mode: "insensitive" },
        },
      });

      if (sub) {
        await prisma.licenseAssignment.create({
          data: {
            organizationId,
            subscriptionId: sub.id,
            externalIdentity: String(data.externalIdentity),
            seatStatus: (data.seatStatus as SeatStatus) || SeatStatus.ASSIGNED,
            assignedAt: data.assignedAt ? new Date(String(data.assignedAt)) : new Date(),
            lastActivityAt: data.lastActivityAt ? new Date(String(data.lastActivityAt)) : null,
            sourceReference: `ImportJob:${job.id}:row:${item.rowNumber}`,
          },
        });
        committedRecords++;
      }
    }
  }

  // Update import job status
  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: job.rejectedCount > 0 ? ImportJobStatus.COMPLETED_WITH_ERRORS : ImportJobStatus.COMPLETED,
      completedAt: new Date(),
    },
  });

  // Audit log
  await createAuditLog({
    organizationId,
    userId,
    action: "IMPORT_COMMITTED",
    entityType: "ImportJob",
    entityId: job.id,
    details: {
      sourceType: job.sourceType,
      fileName: job.originalFileName,
      committedRecords,
      totalRows: job.rowCount,
      duplicates: job.duplicateCount,
      rejected: job.rejectedCount,
    },
  });

  return {
    success: true,
    jobId: job.id,
    committedRecords,
    status: job.rejectedCount > 0 ? ImportJobStatus.COMPLETED_WITH_ERRORS : ImportJobStatus.COMPLETED,
  };
}

