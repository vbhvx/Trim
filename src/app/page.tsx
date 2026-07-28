"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { DashboardView } from "@/components/DashboardView";
import { SubscriptionsView } from "@/components/SubscriptionsView";
import { AiExplorerView } from "@/components/AiExplorerView";
import { InvoicesView } from "@/components/InvoicesView";
import { RecommendationsView } from "@/components/RecommendationsView";
import { IngestionView } from "@/components/IngestionView";
import { IntegrationsView } from "@/components/IntegrationsView";
import { RefreshCw } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [currentRole, setCurrentRole] = useState("ORGANIZATION_OWNER");
  const [orgName, setOrgName] = useState("Acme Corporation");
  const [userName, setUserName] = useState("Alice Owner");
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize session and load dashboard metrics
  const initApp = async () => {
    try {
      // 1. Check current session or log in as default Acme Owner
      let meRes = await fetch("/api/v1/auth/me");
      let meData = await meRes.json();

      if (!meData.success) {
        // Auto-authenticate as default demo user Alice Owner
        const loginRes = await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "owner@acme.com",
            password: "password123",
          }),
        });
        const loginData = await loginRes.json();
        if (loginData.success) {
          meData = {
            success: true,
            data: {
              user: loginData.data.user,
              currentOrganization: loginData.data.organization,
            },
          };
        }
      }

      if (meData.success && meData.data) {
        setUserName(meData.data.user.name);
        if (meData.data.currentOrganization) {
          setOrgName(meData.data.currentOrganization.name);
          setCurrentRole(meData.data.currentOrganization.role);
        }
      }

      // 2. Load spend summary
      await fetchSummary();
    } catch (err) {
      console.error("Initialization error", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch("/api/v1/costs/summary");
      const data = await res.json();
      if (data.success) {
        setSummary(data.data);
      }
    } catch (err) {
      console.error("Failed to load spend summary", err);
    }
  };

  useEffect(() => {
    initApp();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header
        currentRole={currentRole}
        onRoleChange={(newRole) => {
          setCurrentRole(newRole);
          fetchSummary();
        }}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        organizationName={orgName}
        userName={userName}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="py-24 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
            <p className="text-sm font-semibold text-slate-700">
              Initializing Trim Cost Intelligence Platform...
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Connecting normalized financial records and telemetry
            </p>
          </div>
        ) : (
          <>
            {activeTab === "dashboard" && (
              <DashboardView
                summary={summary}
                onRefresh={fetchSummary}
                onNavigate={setActiveTab}
                userRole={currentRole}
              />
            )}
            {activeTab === "subscriptions" && (
              <SubscriptionsView userRole={currentRole} />
            )}
            {activeTab === "ai-explorer" && (
              <AiExplorerView userRole={currentRole} />
            )}
            {activeTab === "invoices" && <InvoicesView userRole={currentRole} />}
            {activeTab === "recommendations" && (
              <RecommendationsView
                userRole={currentRole}
                onRefreshSummary={fetchSummary}
              />
            )}
            {activeTab === "ingestion" && (
              <IngestionView
                userRole={currentRole}
                onRefreshData={fetchSummary}
              />
            )}
            {activeTab === "integrations" && (
              <IntegrationsView userRole={currentRole} />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Trim AI & SaaS Spend Intelligence and Cost Optimization Platform</span>
          <div className="flex items-center space-x-3">
            <span>Deterministic Financial Engine</span>
            <span>•</span>
            <span>Provable Savings Verification</span>
            <span>•</span>
            <a href="/api/v1/docs" target="_blank" className="text-blue-600 hover:underline">
              OpenAPI 3.x
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

