"use client";

import React, { useState } from "react";
import {
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  ArrowRight,
  Database,
  RefreshCw,
  Copy,
} from "lucide-react";

interface IngestionViewProps {
  userRole: string;
  onRefreshData: () => void;
}

export function IngestionView({ userRole, onRefreshData }: IngestionViewProps) {
  const [sourceType, setSourceType] = useState("CSV_SUBSCRIPTIONS");
  const [fileName, setFileName] = useState("subscriptions.csv");
  const [csvContent, setCsvContent] = useState("");
  const [staging, setStaging] = useState(false);
  const [stagedSummary, setStagedSummary] = useState<any | null>(null);
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<string | null>(null);

  const sampleTemplates: Record<string, { fileName: string; content: string }> = {
    CSV_SUBSCRIPTIONS: {
      fileName: "subscriptions.csv",
      content: `Vendor,Product,Plan,Interval,Currency,Amount,Seats,Owner
Linear,Linear App,Standard,MONTHLY,USD,150.00,15,admin@acme.com
Notion,Notion Team,Plus,MONTHLY,USD,240.00,20,admin@acme.com
Datadog,Datadog APM & Logs,Pro Annual,ANNUAL,USD,14400.00,100,admin@acme.com`,
    },
    CSV_INVOICES: {
      fileName: "invoices.csv",
      content: `InvoiceNo,Vendor,Date,Subtotal,Tax,Total,Currency,Status
INV-NOTION-NOV26,Notion,2026-11-01,240.00,0,240.00,USD,PAID
INV-LINEAR-NOV26,Linear,2026-11-01,150.00,0,150.00,USD,PAID`,
    },
    CSV_USAGE: {
      fileName: "ai_usage.csv",
      content: `Vendor,Metric,Quantity,Unit,StartDate,EndDate,Cost,Model,Project
OpenAI,input_tokens,15000000,tokens,2026-11-01,2026-11-08,75.00,gpt-4o,copilot-agent
OpenAI,output_tokens,4000000,tokens,2026-11-01,2026-11-08,60.00,gpt-4o,copilot-agent`,
    },
    CSV_LICENSES: {
      fileName: "licenses.csv",
      content: `Product,UserEmail,Status,AssignedDate,LastActive
Figma Organization,user1@acme.com,ASSIGNED,2026-01-15,2026-11-05
Figma Organization,user2@acme.com,ASSIGNED,2026-02-10,2026-11-08`,
    },
  };

  const loadSample = (type: string) => {
    setSourceType(type);
    setFileName(sampleTemplates[type].fileName);
    setCsvContent(sampleTemplates[type].content);
    setStagedSummary(null);
    setCommitResult(null);
  };

  const handleStageFile = async () => {
    if (!csvContent.trim()) {
      alert("Please provide CSV content");
      return;
    }
    setStaging(true);
    setStagedSummary(null);
    setCommitResult(null);
    try {
      const res = await fetch("/api/v1/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType,
          fileName,
          csvContent,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStagedSummary(data.data.summary);
      } else {
        alert(data.error?.message || "Staging failed");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setStaging(false);
    }
  };

  const handleCommit = async () => {
    if (!stagedSummary) return;
    setCommitting(true);
    try {
      const res = await fetch(`/api/v1/imports/${stagedSummary.jobId}/commit`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setCommitResult(
          `Successfully committed ${data.data.committedRecords} records into production financial tables.`
        );
        onRefreshData();
      } else {
        alert(data.error?.message || "Commit failed");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            CSV File Ingestion & Staging Engine
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Stage, validate, and preview financial records with duplicate detection before committing
          </p>
        </div>

        {/* 1-Click Template Loaders */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 font-semibold">Load Template:</span>
          <button
            onClick={() => loadSample("CSV_SUBSCRIPTIONS")}
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
          >
            Subscriptions
          </button>
          <button
            onClick={() => loadSample("CSV_INVOICES")}
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
          >
            Invoices
          </button>
          <button
            onClick={() => loadSample("CSV_USAGE")}
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
          >
            AI Usage
          </button>
        </div>
      </div>

      {/* Editor & Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Source Ingestion Type
                </label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="CSV_SUBSCRIPTIONS">Subscriptions CSV</option>
                  <option value="CSV_INVOICES">Invoices CSV</option>
                  <option value="CSV_USAGE">AI Usage CSV</option>
                  <option value="CSV_LICENSES">Seat Licenses CSV</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  File Name
                </label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            <button
              onClick={handleStageFile}
              disabled={staging}
              className="mt-4 flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              {staging ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>{staging ? "Parsing..." : "Stage & Preview File"}</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              CSV Content (Paste or edit raw data)
            </label>
            <textarea
              rows={9}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder="Paste comma-separated values here or click 'Load Template' above..."
              className="w-full p-3 font-mono text-xs bg-slate-900 text-slate-100 rounded-xl focus:outline-none"
            />
          </div>
        </div>

        {/* Instructions and Idempotency Rules Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
            <Database className="w-4 h-4 text-blue-600" />
            <span>Ingestion Safeguards</span>
          </h3>

          <div className="space-y-2 text-slate-600">
            <p>
              <strong>1. Duplicate Detection:</strong> Existing active subscriptions and duplicate invoice numbers are identified automatically to prevent double-counting.
            </p>
            <p>
              <strong>2. Staging Before Commit:</strong> Records are placed in a staging area where parse errors can be audited prior to database insertion.
            </p>
            <p>
              <strong>3. Exact Provenance:</strong> Every committed normalized record stores the source file reference, row index, and ingestion timestamp.
            </p>
          </div>

          {commitResult && (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 font-medium">
              ✓ {commitResult}
            </div>
          )}
        </div>
      </div>

      {/* Staged Preview Results */}
      {stagedSummary && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Staging Preview: {stagedSummary.rowCount} Total Rows
              </h3>
              <div className="flex items-center space-x-3 text-xs mt-1">
                <span className="text-emerald-700 font-semibold">
                  ✓ {stagedSummary.acceptedCount} Valid
                </span>
                <span className="text-amber-700 font-semibold">
                  ⚠️ {stagedSummary.duplicateCount} Duplicate
                </span>
                <span className="text-rose-700 font-semibold">
                  ✕ {stagedSummary.rejectedCount} Invalid
                </span>
              </div>
            </div>

            <button
              onClick={handleCommit}
              disabled={committing || stagedSummary.acceptedCount === 0}
              className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
            >
              {committing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span>
                {committing
                  ? "Committing Records..."
                  : `Commit ${stagedSummary.acceptedCount} Valid Record(s)`}
              </span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-4 py-2.5">Row</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Vendor / Product</th>
                  <th className="px-4 py-2.5">Parsed Amount</th>
                  <th className="px-4 py-2.5">Validation Notes & Duplicate Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {stagedSummary.stagedItems.map((item: any) => (
                  <tr key={item.rowNumber} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 font-bold text-slate-500">
                      #{item.rowNumber}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.status === "VALID"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.status === "DUPLICATE"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">
                      {item.normalized?.vendorName || item.raw?.vendor || "—"} •{" "}
                      {item.normalized?.productName || item.raw?.product || "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-700">
                      ${item.normalized?.expectedAmount || item.normalized?.total || item.raw?.amount || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {item.errors ? (
                        <span className="text-rose-600">{item.errors.join("; ")}</span>
                      ) : item.duplicateReason ? (
                        <span className="text-amber-700">{item.duplicateReason}</span>
                      ) : (
                        <span className="text-emerald-700">Ready for database commit</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

