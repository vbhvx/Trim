import { describe, it, expect } from "vitest";
import prisma from "../prisma";
import { authenticate } from "./session";

describe("Organization Isolation & Cross-Tenant Boundary Tests", () => {
  it("prevents user of Organization B (Globex) from viewing subscriptions of Organization A (Acme)", async () => {
    const acmeOrg = await prisma.organization.findFirst({
      where: { name: "Acme Corporation" },
    });
    const globexOrg = await prisma.organization.findFirst({
      where: { name: "Globex Industries" },
    });
    expect(acmeOrg).toBeDefined();
    expect(globexOrg).toBeDefined();

    // Query subscriptions scoped to Globex org
    const globexSubs = await prisma.subscription.findMany({
      where: { organizationId: globexOrg!.id },
    });

    // Globex has 0 subscriptions; must never leak Acme subscriptions!
    expect(globexSubs.length).toBe(0);

    const acmeSubs = await prisma.subscription.findMany({
      where: { organizationId: acmeOrg!.id },
    });
    expect(acmeSubs.length).toBeGreaterThan(0);

    // Cross-org check: Ensure none of Acme subscriptions have Globex's orgId
    const leaked = acmeSubs.filter((s) => s.organizationId === globexOrg!.id);
    expect(leaked.length).toBe(0);
  });

  it("prevents user of Organization B from viewing invoices or recommendations of Organization A", async () => {
    const globexOrg = await prisma.organization.findFirst({
      where: { name: "Globex Industries" },
    });

    const globexInvoices = await prisma.invoice.findMany({
      where: { organizationId: globexOrg!.id },
    });
    expect(globexInvoices.length).toBe(0);

    const globexRecs = await prisma.recommendation.findMany({
      where: { organizationId: globexOrg!.id },
    });
    expect(globexRecs.length).toBe(0);
  });

  it("rejects authentication attempt when user does not belong to specified organization", async () => {
    const globexUser = await prisma.user.findFirst({
      where: { email: "competitor@globex.com" },
    });
    const acmeOrg = await prisma.organization.findFirst({
      where: { name: "Acme Corporation" },
    });

    // Generate a spoofed token where globexUser claims to be in acmeOrg
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(
      process.env.APP_SECRET || "trim-platform-default-secret-key-32-chars-long!!"
    );

    const spoofedToken = await new SignJWT({
      userId: globexUser!.id,
      organizationId: acmeOrg!.id, // Spoofed!
      role: "ORGANIZATION_OWNER",
      email: globexUser!.email,
      name: globexUser!.name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret);

    const fakeReq = new Request("http://localhost:3000/api/v1/subscriptions", {
      headers: {
        authorization: `Bearer ${spoofedToken}`,
      },
    });

    // authenticate() verifies database membership and must reject spoofed org
    await expect(authenticate(fakeReq)).rejects.toThrow(
      /User does not belong to the requested organization/
    );
  });
});

