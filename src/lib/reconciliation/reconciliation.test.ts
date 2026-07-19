import { describe, it, expect } from "vitest";
import prisma from "../prisma";
import { runInvoiceReconciliation } from "./reconciler";

describe("Invoice Reconciliation & Discrepancy Detection", () => {
  it("detects unexpected price hikes where invoice exceeds contractual plan amount", async () => {
    const acmeOrg = await prisma.organization.findFirst({
      where: { name: "Acme Corporation" },
    });
    expect(acmeOrg).toBeDefined();

    const result = await runInvoiceReconciliation(acmeOrg!.id);
    expect(result.invoicesAnalyzed).toBeGreaterThan(0);

    const priceHike = result.discrepancyList.find(
      (d) => d.discrepancyType === "UNEXPECTED_PRICE_HIKE"
    );

    expect(priceHike).toBeDefined();
    expect(priceHike!.vendorName).toBe("GitHub");
    expect(priceHike!.expectedAmount.toString()).toBe("4200");
    expect(priceHike!.observedAmount.toString()).toBe("5800");
    expect(priceHike!.differenceAmount.toString()).toBe("1600");
    expect(priceHike!.explanation).toContain("+38.1%");
  });

  it("persists discrepancies with DETECTED status in database idempotently", async () => {
    const acmeOrg = await prisma.organization.findFirst({
      where: { name: "Acme Corporation" },
    });

    const persisted = await prisma.reconciliationDiscrepancy.findMany({
      where: { organizationId: acmeOrg!.id },
    });

    expect(persisted.length).toBeGreaterThan(0);
    const ghDisc = persisted.find((p) => p.vendorName === "GitHub");
    expect(ghDisc).toBeDefined();
    expect(ghDisc!.status).toBe("DETECTED");
  });
});

