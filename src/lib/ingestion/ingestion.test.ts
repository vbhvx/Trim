import { describe, it, expect, beforeEach } from "vitest";
import prisma from "../prisma";
import { stageImportFile, commitImportJob } from "./staging-engine";
import { SourceType } from "@prisma/client";

describe("CSV Ingestion, Staging Preview & Idempotency", () => {
  beforeEach(async () => {
    // Clean up any test-specific subscriptions to ensure fresh test runs
    const acmeOrg = await prisma.organization.findFirst({
      where: { name: "Acme Corporation" },
    });
    if (acmeOrg) {
      await prisma.subscription.deleteMany({
        where: {
          organizationId: acmeOrg.id,
          productName: { in: ["Linear App", "Notion Team", "Duplicate Test Product"] },
        },
      });
      await prisma.invoice.deleteMany({
        where: {
          organizationId: acmeOrg.id,
          invoiceNumber: "INV-NEW-999",
        },
      });
    }
  });

  it("stages and previews CSV with valid and invalid rows", async () => {
    const acmeOrg = await prisma.organization.findFirst({
      where: { name: "Acme Corporation" },
    });
    expect(acmeOrg).toBeDefined();

    const sampleCsv = `Vendor,Product,Plan,Interval,Currency,Amount,Seats,Owner
Linear,Linear App,Standard,MONTHLY,USD,150,15,admin@acme.com
Notion,Notion Team,Plus,MONTHLY,USD,240,20,admin@acme.com
BadVendor,MissingProduct,Pro,MONTHLY,USD,INVALID_AMOUNT,10,admin@acme.com`;

    const summary = await stageImportFile({
      organizationId: acmeOrg!.id,
      sourceType: SourceType.CSV_SUBSCRIPTIONS,
      fileName: "subscriptions_test.csv",
      fileContent: sampleCsv,
    });

    expect(summary.rowCount).toBe(3);
    expect(summary.acceptedCount).toBe(2);
    expect(summary.rejectedCount).toBe(1);
    expect(summary.duplicateCount).toBe(0);

    const invalidItem = summary.stagedItems.find((i) => i.status === "INVALID");
    expect(invalidItem).toBeDefined();
    expect(invalidItem!.errors?.[0]).toContain("expectedAmount");

    // Commit valid records
    const commitResult = await commitImportJob(summary.jobId, acmeOrg!.id);
    expect(commitResult.committedRecords).toBe(2);

    // Verify created in DB
    const linearSub = await prisma.subscription.findFirst({
      where: { organizationId: acmeOrg!.id, productName: "Linear App" },
    });
    expect(linearSub).toBeDefined();
    expect(linearSub!.expectedAmount.toString()).toBe("150");
  });

  it("prevents double-counting by detecting duplicate subscriptions on subsequent import", async () => {
    const acmeOrg = await prisma.organization.findFirst({
      where: { name: "Acme Corporation" },
    });

    // Create primary subscription first
    const v = await prisma.vendor.findFirst({ where: { organizationId: acmeOrg!.id } });
    await prisma.subscription.create({
      data: {
        organizationId: acmeOrg!.id,
        vendorId: v!.id,
        productName: "Duplicate Test Product",
        planName: "Pro",
        expectedAmount: 100,
      },
    });

    const duplicateCsv = `Vendor,Product,Plan,Interval,Currency,Amount,Seats
${v!.name},Duplicate Test Product,Pro,MONTHLY,USD,100,10`;

    const summary = await stageImportFile({
      organizationId: acmeOrg!.id,
      sourceType: SourceType.CSV_SUBSCRIPTIONS,
      fileName: "duplicate_sub.csv",
      fileContent: duplicateCsv,
    });

    expect(summary.duplicateCount).toBe(1);
    expect(summary.acceptedCount).toBe(0);
    expect(summary.stagedItems[0].status).toBe("DUPLICATE");
    expect(summary.stagedItems[0].duplicateReason).toContain("already exists");
  });

  it("detects and rejects duplicate invoice numbers for the same vendor", async () => {
    const acmeOrg = await prisma.organization.findFirst({
      where: { name: "Acme Corporation" },
    });

    // We already have INV-SLACK-2026-001 in the seed
    const invoiceCsv = `InvoiceNo,Vendor,Date,Total,Currency,Status
INV-SLACK-2026-001,Slack Technologies,2026-10-01,18000.00,USD,PAID
INV-NEW-999,Slack Technologies,2026-11-01,1500.00,USD,PAID`;

    const summary = await stageImportFile({
      organizationId: acmeOrg!.id,
      sourceType: SourceType.CSV_INVOICES,
      fileName: "invoices.csv",
      fileContent: invoiceCsv,
    });

    expect(summary.rowCount).toBe(2);
    expect(summary.duplicateCount).toBe(1);
    expect(summary.acceptedCount).toBe(1);

    const dup = summary.stagedItems.find((s) => s.status === "DUPLICATE");
    expect(dup?.duplicateReason).toContain("INV-SLACK-2026-001");
  });
});
