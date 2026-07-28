"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  X,
  ExternalLink,
} from "lucide-react";
import { formatMoney } from "@/lib/financial/decimal";

interface InvoicesViewProps {
  userRole: string;
}

export function InvoicesView({ userRole }: InvoicesViewProps) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [reviewModalDisc, setReviewModalDisc] = useState<any | null>(null);
  const [reviewStatus, setReviewStatus] = useState("RESOLVED");
  const [reviewNotes, setReviewNotes] = useState("");
  const [savingResolution, setSavingResolution] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, discRes] = await Promise.all([
        fetch("/api/v1/invoices"),
        fetch("/api/v1/reconciliation"),
      ]);
      const invData = await invRes.json();
      const discData = await discRes.json();
      if (invData.success) setInvoices(invData.data || []);
      if (discData.success) setDiscrepancies(discData.data || []);
    } catch (err) {
      console.error("Failed to load invoice reconciliation", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunRecon = async () => {
    setReconciling(true);
    try {
      const res = await fetch("/api/v1/reconciliation", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (err) {
      console.error("Reconciliation execution failed", err);
    } finally {
      setReconciling(false);
    }
  };

  const handleSaveResolution = async () => {
    if (!reviewModalDisc) return;
    setSavingResolution(true);
    try {
      const res = await fetch(`/api/v1/reconciliation/${reviewModalDisc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: reviewStatus,
          notes: reviewNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReviewModalDisc(null);
        fetchData();
      }
    } catch (err) {
      console.error("Failed to resolve discrepancy", err);
    } finally {
      setSavingResolution(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Run Reconciliation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Invoice Reconciliation & Audit
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare actual invoice charges against plan agreements, line items, and previous billing terms
          </p>
        </div>

        <button
          onClick={handleRunRecon}
          disabled={reconciling}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${reconciling ? "animate-spin" : ""}`} />
          <span>{reconciling ? "Reconciling Invoices..." : "Run Reconciliation"}</span>
        </button>
      </div>

      {/* Discrepancies Section */}
      {discrepancies.length > 0 && (
        <div className="bg-rose-50/70 p-5 rounded-2xl border border-rose-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-rose-900 uppercase">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Detected Billing Discrepancies ({discrepancies.length})</span>
            </div>
            <span className="text-[11px] text-rose-700">
              Discrepancies do not necessarily prove an overcharge (e.g. taxes, proration, foreign exchange)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {discrepancies.map((disc) => (
              <div
                key={disc.id}
                className="bg-white p-4 rounded-xl border border-rose-200 text-xs space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      {disc.vendorName}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        disc.status === "DETECTED"
                          ? "bg-rose-100 text-rose-800"
                          : disc.status === "UNDER_REVIEW"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {disc.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{disc.notes}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    Difference: <strong className="text-rose-700">${disc.differenceAmount}</strong>
                  </span>
                  <button
                    onClick={() => {
                      setReviewModalDisc(disc);
                      setReviewStatus(disc.status);
                      setReviewNotes(disc.notes || "");
                    }}
                    className="font-bold text-blue-600 hover:underline"
                  >
                    Resolve Discrepancy →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoices List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">
            Recorded Invoices & Cash Flow Outlays
          </h3>
          <p className="text-xs text-slate-500">
            Authoritative source invoice records and itemized line billing
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Invoice #</th>
                <th className="px-5 py-3">Vendor</th>
                <th className="px-5 py-3">Invoice Date</th>
                <th className="px-5 py-3">Subtotal</th>
                <th className="px-5 py-3">Tax</th>
                <th className="px-5 py-3">Total Charged</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No invoices recorded yet.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50/70 transition cursor-pointer"
                    onClick={() => setSelectedInvoice(inv)}
                  >
                    <td className="px-5 py-3.5 font-bold text-slate-900 font-mono">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {inv.vendor?.name}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {inv.invoiceDate.split("T")[0]}
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {formatMoney(inv.subtotal, inv.currency)}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {formatMoney(inv.tax, inv.currency)}
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-900">
                      {formatMoney(inv.total, inv.currency)}
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedInvoice(inv);
                        }}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Drawer */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                  Invoice Details
                </span>
                <h2 className="text-lg font-bold text-slate-900 font-mono">
                  {selectedInvoice.invoiceNumber}
                </h2>
                <p className="text-xs text-slate-500">
                  Vendor: {selectedInvoice.vendor?.name} • Date: {selectedInvoice.invoiceDate.split("T")[0]}
                </p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal:</span>
                <span className="font-semibold text-slate-800">{formatMoney(selectedInvoice.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Taxes:</span>
                <span className="font-semibold text-slate-800">{formatMoney(selectedInvoice.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900">
                <span>Total Invoiced:</span>
                <span>{formatMoney(selectedInvoice.total)}</span>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase">Line Items</h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {selectedInvoice.lineItems?.map((li: any) => (
                  <div key={li.id} className="p-3 bg-white text-xs flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-slate-900">{li.description}</div>
                      <div className="text-[11px] text-slate-400">Classification: Standard SaaS</div>
                    </div>
                    <span className="font-bold text-slate-900">{formatMoney(li.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discrepancy Resolution Modal */}
      {reviewModalDisc && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Resolve Discrepancy
              </h2>
              <button
                onClick={() => setReviewModalDisc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1 bg-rose-50 p-3 rounded-xl border border-rose-200">
              <div className="font-bold text-rose-900">{reviewModalDisc.discrepancyType}</div>
              <p>{reviewModalDisc.notes}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Resolution Status
                </label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="RESOLVED">Resolved (Credit Issued / Adjusted)</option>
                  <option value="UNDER_REVIEW">Under Review (Vendor Contacted)</option>
                  <option value="DISMISSED">Dismissed (Legitimate Proration / Tax)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Audit Notes & Resolution Explanation
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Record justification or reference to credit memo..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setReviewModalDisc(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveResolution}
                disabled={savingResolution}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs"
              >
                {savingResolution ? "Saving..." : "Save Resolution"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

