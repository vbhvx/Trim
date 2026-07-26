import { NextResponse } from "next/server";

export async function GET() {
  const openApiSpec = {
    openapi: "3.0.3",
    info: {
      title: "Trim - AI & SaaS Spend Intelligence and Cost Optimization Platform API",
      version: "1.0.0",
      description:
        "Comprehensive API for managing SaaS subscriptions, AI API spend analytics, seat utilization, duplicate detection, invoice reconciliation, and evidence-based recommendation workflows.",
    },
    servers: [
      {
        url: "/api/v1",
        description: "Primary v1 API Server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    paths: {
      "/auth/login": {
        post: {
          summary: "Authenticate user and receive session token",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                  },
                  required: ["email", "password"],
                },
              },
            },
          },
          responses: {
            "200": { description: "Authentication successful with token" },
            "401": { description: "Invalid credentials" },
          },
        },
      },
      "/subscriptions": {
        get: {
          summary: "List normalized subscriptions with search and filtering",
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "List of subscriptions" } },
        },
        post: {
          summary: "Create a subscription record manually",
          security: [{ BearerAuth: [] }],
          responses: { "201": { description: "Subscription created" } },
        },
      },
      "/invoices": {
        get: {
          summary: "List invoices with discrepancy indicators",
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "List of invoices" } },
        },
        post: {
          summary: "Create invoice manually",
          security: [{ BearerAuth: [] }],
          responses: { "201": { description: "Invoice recorded" } },
        },
      },
      "/costs/summary": {
        get: {
          summary: "Executive spend dashboard summary (normalized recurring vs actual cash flow)",
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Spend summary metrics" } },
        },
      },
      "/costs/ai-usage": {
        get: {
          summary: "AI API usage analytics, model breakdown, token metrics, and anomaly detection",
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "AI cost metrics" } },
        },
      },
      "/analysis/run": {
        post: {
          summary: "Execute deterministic rules-based optimization and invoice reconciliation engine",
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Analysis results" } },
        },
      },
      "/recommendations": {
        get: {
          summary: "List actionable optimization recommendations with evidence and assumptions",
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Recommendations list" } },
        },
      },
      "/recommendations/{id}/approve": {
        post: {
          summary: "Approve recommendation for implementation",
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Recommendation approved" } },
        },
      },
      "/recommendations/{id}/verify": {
        post: {
          summary: "Verify and record measured realized savings outcome",
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Savings verified and recorded" } },
        },
      },
      "/recommendations/{id}/explain": {
        post: {
          summary: "Generate grounded executive explanation via AI adapter (or deterministic fallback)",
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Explanation generated" } },
        },
      },
      "/imports": {
        post: {
          summary: "Upload and stage CSV file for preview and duplicate validation",
          security: [{ BearerAuth: [] }],
          responses: { "201": { description: "File staged with summary" } },
        },
      },
      "/imports/{id}/commit": {
        post: {
          summary: "Commit staged valid records to production tables",
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Import committed" } },
        },
      },
    },
  };

  return NextResponse.json(openApiSpec);
}

