"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Zap,
  AlertTriangle,
  Layers,
  Cpu,
  BarChart2,
  TrendingUp,
  DollarSign,
  Database,
} from "lucide-react";
import { formatMoney } from "@/lib/financial/decimal";

interface AiExplorerViewProps {
  userRole: string;
}

export function AiExplorerView({ userRole }: AiExplorerViewProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/costs/ai-usage")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .catch((err) => console.error("Failed to load AI usage", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs">
        Loading AI spend telemetry and model usage...
      </div>
    );
  }

  const {
    totalReportedCost = 0,
    totalTokens = 0,
    totalRequests = 0,
    providerBreakdown = [],
    modelBreakdown = [],
    projectBreakdown = [],
    anomaliesDetected = [],
  } = data || {};

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900">
              AI API Spend & Token Analytics
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center space-x-1">
              <Sparkles className="w-3 h-3" />
              <span>Model Telemetry</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Model-level cost attribution, token consumption, request unit economics, and anomaly alerts
          </p>
        </div>
      </div>

      {/* AI Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>Total AI Reported Spend</span>
            <DollarSign className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatMoney(totalReportedCost)}
          </div>
          <span className="text-[11px] text-slate-400">
            Trailing 30-day API usage billings
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>Total Token Consumption</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {(Number(totalTokens) / 1_000_000).toFixed(1)}M
          </div>
          <span className="text-[11px] text-slate-400">
            Combined input, output & cached tokens
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>Total API Requests</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {Number(totalRequests).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">
            Recorded across supported LLM providers
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>Average Unit Economics</span>
            <Cpu className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {totalRequests > 0
              ? formatMoney(Number(totalReportedCost) / totalRequests, "USD", 4)
              : "$0.00"}
            <span className="text-xs text-slate-400 font-normal"> /req</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Global average across all application endpoints
          </span>
        </div>
      </div>

      {/* Anomaly Detection Banner */}
      {anomaliesDetected.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-sm space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-900 uppercase">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>AI Cost Anomalies Detected ({anomaliesDetected.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {anomaliesDetected.map((a: any, idx: number) => (
              <div
                key={idx}
                className="bg-white/80 p-3.5 rounded-xl border border-amber-200/80 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{a.description}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                    {a.severity}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-[11px] text-slate-500 pt-1">
                  <span>Current: <strong className="text-slate-800">{a.currentValue}</strong></span>
                  <span>•</span>
                  <span>Baseline: <strong className="text-slate-800">{a.baselineValue}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Model Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">
            Model-Level Cost & Consumption Breakdown
          </h3>
          <p className="text-xs text-slate-500">
            Granular token counts, billable charges, and unit economics per model
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Model</th>
                <th className="px-5 py-3">Provider</th>
                <th className="px-5 py-3">Input Tokens</th>
                <th className="px-5 py-3">Output Tokens</th>
                <th className="px-5 py-3">API Requests</th>
                <th className="px-5 py-3">Reported Cost</th>
                <th className="px-5 py-3">Cost / 1M Tokens</th>
                <th className="px-5 py-3">Cost / Request</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {modelBreakdown.map((m: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition">
                  <td className="px-5 py-3.5 font-bold text-slate-900">
                    {m.modelIdentifier}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">
                      {m.provider}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-700 font-mono">
                    {Number(m.inputTokens).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-slate-700 font-mono">
                    {Number(m.outputTokens).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-slate-700 font-mono">
                    {Number(m.apiRequests).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 font-bold text-slate-900">
                    {formatMoney(m.reportedCost)}
                  </td>
                  <td className="px-5 py-3 font-semibold text-blue-700">
                    ${Number(m.costPer1MTokens).toFixed(2)}
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-800">
                    ${Number(m.costPerRequest).toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provider & Project Attribution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Provider Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900">
            Spend by AI Provider
          </h3>
          <div className="space-y-3">
            {providerBreakdown.map((p: any, idx: number) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-800">{p.provider}</span>
                  <span className="text-slate-900">
                    {formatMoney(p.cost)} ({p.tokenSharePct}% tokens)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full"
                    style={{ width: `${Math.min(100, p.tokenSharePct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Project Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900">
            Attribution by Project / Application
          </h3>
          <div className="space-y-3">
            {projectBreakdown.map((proj: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">{proj.project}</div>
                  <div className="text-[11px] text-slate-500">
                    {proj.requests.toLocaleString()} total API executions
                  </div>
                </div>
                <div className="text-right font-bold text-slate-900">
                  {formatMoney(proj.cost)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

