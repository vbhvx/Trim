"use client";

import React, { useState } from "react";
import {
  TrendingDown,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  Clock,
  Database,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { formatMoney } from "@/lib/financial/decimal";

interface DashboardViewProps {
  summary: any;
  onRefresh: () => void;
  onNavigate: (tab: string) => void;
  userRole: string;
}

export function DashboardView({
  summary,
  onRefresh,
  onNavigate,
  userRole,
}: DashboardViewProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const res = await fetch("/api/v1/analysis/run", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setAnalysisResult(
          `Analysis complete: Generated ${data.data.recommendationsCount} optimization opportunities!`
        );
        onRefresh();
      } else {
        setAnalysisResult(`Error: ${data.error?.message || "Analysis failed"}`);
      }
    } catch (err: any) {
      setAnalysisResult(`Error: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  if (!summary) {
    return (
      <div className="py-20 text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-400 mb-2" />
        <p className="text-sm text-slate-500">Loading spend intelligence data...</p>
      </div>
    );
  }

  const {
    period,
    actualInvoicedSpend,
    normalizedMonthlyRecurring,
    annualizedRecurringCommitment,
    potentialSavingsAwaitingReview,
    verifiedRealizedSavings,
    activeSubscriptionsCount,
    upcomingRenewalsCount,
    unresolvedDiscrepanciesCount,
    spendByCategory = [],
    spendByVendor = [],
    monthlyTrend = [],
    dataFreshness,
  } = summary;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner with Period and Action */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900">
              Spend Intelligence Overview
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active Period: {period}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Consolidated normalized financial analytics and verifiable cost optimization
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRunAnalysis}
            disabled={analyzing}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition disabled:opacity-50"
          >
            {analyzing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>
              {analyzing ? "Running Rule Engine..." : "Run Optimization Analysis"}
            </span>
          </button>
        </div>
      </div>

      {analysisResult && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
            analysisResult.startsWith("Error")
              ? "bg-rose-50 text-rose-800 border-rose-200"
              : "bg-emerald-50 text-emerald-800 border-emerald-200"
          }`}
        >
          <span>{analysisResult}</span>
          <button
            onClick={() => onNavigate("recommendations")}
            className="underline font-bold ml-2"
          >
            View Recommendations →
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Actual Invoiced (Cash flow) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Actual Invoiced Spend</span>
              <DollarSign className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatMoney(actualInvoicedSpend)}
            </div>
            <span className="text-[11px] font-medium text-slate-400">
              Cash flow outlay (calendar month)
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Billing Interval</span>
            <span className="font-semibold text-slate-700">Current Invoices</span>
          </div>
        </div>

        {/* Normalized Recurring (MRR) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Normalized Monthly</span>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-blue-900 tracking-tight">
              {formatMoney(normalizedMonthlyRecurring)}
            </div>
            <span className="text-[11px] font-medium text-blue-600/80">
              Amortized recurring run-rate
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Subscriptions</span>
            <span className="font-semibold text-slate-700">
              {activeSubscriptionsCount} Active
            </span>
          </div>
        </div>

        {/* Annualized Commitment (ARR) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Annual Commitment</span>
              <Calendar className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatMoney(annualizedRecurringCommitment)}
            </div>
            <span className="text-[11px] font-medium text-slate-400">
              Contractual ARR commitment
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Upcoming Renewals</span>
            <span
              className={`font-semibold ${
                upcomingRenewalsCount > 0 ? "text-amber-600 font-bold" : "text-slate-700"
              }`}
            >
              {upcomingRenewalsCount} in &lt;30d
            </span>
          </div>
        </div>

        {/* Potential Savings (Hypothetical) */}
        <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-amber-800 mb-1">
              <span>Potential Savings</span>
              <TrendingDown className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-950 tracking-tight">
              {formatMoney(potentialSavingsAwaitingReview)}
            </div>
            <span className="text-[11px] font-medium text-amber-700">
              ⚠️ Hypothetical awaiting review
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-200/60 flex items-center justify-between text-[11px]">
            <span className="text-amber-800">Status</span>
            <button
              onClick={() => onNavigate("recommendations")}
              className="font-bold text-amber-900 hover:underline flex items-center space-x-0.5"
            >
              <span>Review</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Verified Realized Savings (Actual Measured Outcomes) */}
        <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 mb-1">
              <span>Verified Realized Savings</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-950 tracking-tight">
              {formatMoney(verifiedRealizedSavings)}
            </div>
            <span className="text-[11px] font-medium text-emerald-700">
              ✓ Verified bank & invoice outcome
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-200/60 flex items-center justify-between text-[11px] text-emerald-800">
            <span>Audited By</span>
            <span className="font-semibold text-emerald-900">Finance Manager</span>
          </div>
        </div>
      </div>

      {/* Discrepancy & Renewal Alert Banners */}
      {(upcomingRenewalsCount > 0 || unresolvedDiscrepanciesCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcomingRenewalsCount > 0 && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-blue-900">
                    {upcomingRenewalsCount} Contract Renewal(s) Approaching
                  </h4>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Contracts renewing within the next 30 days. Review seat counts and negotiate before auto-commit lock.
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate("subscriptions")}
                className="text-xs font-bold text-blue-800 underline whitespace-nowrap ml-3"
              >
                Inspect Renewals →
              </button>
            </div>
          )}

          {unresolvedDiscrepanciesCount > 0 && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-900">
                    {unresolvedDiscrepanciesCount} Invoice Discrepanc(ies) Detected
                  </h4>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Charges differ from contractual expected rates or line item sums. Review audit evidence.
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate("invoices")}
                className="text-xs font-bold text-rose-800 underline whitespace-nowrap ml-3"
              >
                Audit Invoices →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Spend Trend (SVG Chart) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Monthly Spending Trend
              </h3>
              <p className="text-xs text-slate-500">
                Actual Cash-Flow Invoices vs. Normalized Recurring Commitment
              </p>
            </div>
            <div className="flex items-center space-x-4 text-xs font-medium">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-sm bg-blue-600" />
                <span className="text-slate-600">Actual Invoiced</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-sm bg-indigo-300" />
                <span className="text-slate-600">Normalized Recurring</span>
              </div>
            </div>
          </div>

          {/* Responsive SVG Bar & Line Chart */}
          <div className="h-64 w-full flex items-end justify-between space-x-3 pt-6 border-b border-slate-200 pb-2">
            {monthlyTrend.map((t: any, idx: number) => {
              const maxVal = Math.max(
                ...monthlyTrend.map((x: any) =>
                  Math.max(Number(x.invoicedAmount), Number(x.normalizedMonthly))
                ),
                30000
              );
              const invoicedHeight = Math.min(
                100,
                Math.max(12, (Number(t.invoicedAmount) / maxVal) * 100)
              );
              const normalizedHeight = Math.min(
                100,
                Math.max(12, (Number(t.normalizedMonthly) / maxVal) * 100)
              );

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center h-full justify-end group"
                >
                  <div className="text-[10px] text-slate-400 mb-1 opacity-0 group-hover:opacity-100 transition">
                    ${Number(t.invoicedAmount).toLocaleString()}
                  </div>
                  <div className="w-full max-w-[48px] flex items-end space-x-1.5 h-full">
                    {/* Invoiced Bar */}
                    <div
                      style={{ height: `${invoicedHeight}%` }}
                      className="flex-1 bg-blue-600 rounded-t-md transition-all hover:bg-blue-700"
                      title={`Invoiced: $${t.invoicedAmount}`}
                    />
                    {/* Normalized Bar */}
                    <div
                      style={{ height: `${normalizedHeight}%` }}
                      className="flex-1 bg-indigo-200 rounded-t-md transition-all hover:bg-indigo-300"
                      title={`Normalized Monthly: $${t.normalizedMonthly}`}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-slate-600 mt-2">
                    {t.month}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>Data Provenance: Normalized from PostgreSQL records</span>
            <span>All figures presented in USD</span>
          </div>
        </div>

        {/* Spend by Category */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Spend by Category
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Normalized monthly allocation
            </p>

            <div className="space-y-3.5">
              {spendByCategory.map((c: any, idx: number) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{c.category}</span>
                    <span className="text-slate-900">
                      {formatMoney(c.amount)} ({c.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, c.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 text-[11px] text-slate-400">
            Categorized across AI API Providers, Developer Tools, Communication, Design, and Infrastructure.
          </div>
        </div>
      </div>

      {/* Top Vendors Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Top Vendors by Normalized Monthly Spend
            </h3>
            <p className="text-xs text-slate-500">
              Ranked by recurring financial commitment
            </p>
          </div>
          <button
            onClick={() => onNavigate("subscriptions")}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
          >
            <span>View All Subscriptions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Vendor</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Normalized Monthly</th>
                <th className="px-5 py-3">Share of Spend</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {spendByVendor.slice(0, 6).map((v: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition">
                  <td className="px-5 py-3.5 font-bold text-slate-900">
                    {v.vendor}
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                      SaaS Service
                    </span>
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-900">
                    {formatMoney(v.amount)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full"
                          style={{ width: `${Math.min(100, v.percentage)}%` }}
                        />
                      </div>
                      <span className="text-slate-600">{v.percentage}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => onNavigate("subscriptions")}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

