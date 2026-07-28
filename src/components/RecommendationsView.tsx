"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  TrendingDown,
  Shield,
  Layers,
  X,
  Bot,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import { formatMoney } from "@/lib/financial/decimal";

interface RecommendationsViewProps {
  userRole: string;
  onRefreshSummary: () => void;
}

export function RecommendationsView({
  userRole,
  onRefreshSummary,
}: RecommendationsViewProps) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedRec, setSelectedRec] = useState<any | null>(null);

  // AI Explanation State
  const [explaining, setExplaining] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<any | null>(null);

  // Verify Realized Savings Modal State
  const [verifyModalRec, setVerifyModalRec] = useState<any | null>(null);
  const [actionTaken, setActionTaken] = useState("");
  const [baselineAmount, setBaselineAmount] = useState("");
  const [actualAfter, setActualAfter] = useState("");
  const [verificationMethod, setVerificationMethod] = useState(
    "Audited subsequent monthly vendor invoice statement"
  );
  const [evidenceReference, setEvidenceReference] = useState("Invoice #POST-OPT-01");
  const [notes, setNotes] = useState("");
  const [submittingVerify, setSubmittingVerify] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const url =
        statusFilter === "ALL"
          ? "/api/v1/recommendations"
          : `/api/v1/recommendations?status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setRecommendations(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load recommendations", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [statusFilter]);

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/recommendations/${id}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        fetchRecommendations();
        onRefreshSummary();
        if (selectedRec?.id === id) setSelectedRec(null);
      } else {
        alert(data.error?.message || "Failed to approve");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    try {
      const res = await fetch(`/api/v1/recommendations/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: reason }),
      });
      const data = await res.json();
      if (data.success) {
        fetchRecommendations();
        onRefreshSummary();
        if (selectedRec?.id === id) setSelectedRec(null);
      } else {
        alert(data.error?.message || "Failed to reject");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleImplement = async (id: string) => {
    const action = prompt("Describe action taken to implement recommendation:");
    if (!action) return;
    try {
      const res = await fetch(`/api/v1/recommendations/${id}/implement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionTaken: action }),
      });
      const data = await res.json();
      if (data.success) {
        fetchRecommendations();
        onRefreshSummary();
        if (selectedRec?.id === id) setSelectedRec(null);
      } else {
        alert(data.error?.message || "Failed to mark implemented");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyModalRec) return;
    setSubmittingVerify(true);
    setVerifyError("");
    try {
      const res = await fetch(`/api/v1/recommendations/${verifyModalRec.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionTaken,
          baselineAmount: parseFloat(baselineAmount),
          actualAmountAfter: parseFloat(actualAfter),
          verificationMethod,
          evidenceReference,
          notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setVerifyModalRec(null);
        fetchRecommendations();
        onRefreshSummary();
      } else {
        setVerifyError(data.error?.message || "Verification failed");
      }
    } catch (err: any) {
      setVerifyError(err.message);
    } finally {
      setSubmittingVerify(false);
    }
  };

  const handleExplainWithAi = async (rec: any) => {
    setSelectedRec(rec);
    setExplaining(true);
    setAiExplanation(null);
    try {
      const res = await fetch(`/api/v1/recommendations/${rec.id}/explain`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setAiExplanation(data.data);
      }
    } catch (err) {
      console.error("AI explanation failed", err);
    } finally {
      setExplaining(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Status Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Optimization Recommendations & Savings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Evidence-based cost reduction opportunities with explicit financial assumptions and lifecycle tracking
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
          {["ALL", "NEW", "APPROVED", "IMPLEMENTED", "VERIFIED", "REJECTED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendations Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs">
            Loading recommendations...
          </div>
        ) : recommendations.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
            No recommendations currently matching filter &apos;{statusFilter}&apos;. Run analysis from Dashboard to regenerate!
          </div>
        ) : (
          recommendations.map((rec) => {
            const isVerified = rec.status === "VERIFIED";
            const isApproved = rec.status === "APPROVED";
            const isImplemented = rec.status === "IMPLEMENTED";

            return (
              <div
                key={rec.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        rec.priority === "CRITICAL"
                          ? "bg-rose-100 text-rose-800"
                          : rec.priority === "HIGH"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {rec.priority} Priority
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isVerified
                          ? "bg-emerald-100 text-emerald-800"
                          : isApproved
                          ? "bg-blue-100 text-blue-800"
                          : isImplemented
                          ? "bg-purple-100 text-purple-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {rec.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {rec.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-3">
                    {rec.description}
                  </p>
                </div>

                {/* Savings and Confidence Box */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400">
                      {isVerified ? "Realized Savings" : "Projected Savings"}
                    </span>
                    <div className="text-base font-black text-slate-900">
                      {formatMoney(rec.estimatedSavings)}
                      <span className="text-xs font-normal text-slate-500">/mo</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400">Confidence</span>
                    <div className="text-xs font-bold text-emerald-700 uppercase">
                      {rec.confidence}
                    </div>
                  </div>
                </div>

                {/* Verified Outcome Banner */}
                {isVerified && rec.outcomes?.[0] && (
                  <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-[11px] text-emerald-900 space-y-0.5">
                    <div className="font-bold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Verified by {rec.outcomes[0].verifiedBy?.name || "Finance"}</span>
                    </div>
                    <div>Baseline: ${rec.outcomes[0].baselineAmount} → Actual: ${rec.outcomes[0].actualAmountAfter}</div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                  <button
                    onClick={() => handleExplainWithAi(rec)}
                    className="flex items-center space-x-1 text-indigo-600 hover:text-indigo-800"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Explain</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    {rec.status === "NEW" && (
                      <>
                        <button
                          onClick={() => handleApprove(rec.id)}
                          className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px]"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(rec.id)}
                          className="px-2 py-1 rounded text-slate-400 hover:text-rose-600 text-[11px]"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {rec.status === "APPROVED" && (
                      <button
                        onClick={() => handleImplement(rec.id)}
                        className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-[11px]"
                      >
                        Mark Implemented
                      </button>
                    )}

                    {rec.status === "IMPLEMENTED" && (
                      <button
                        onClick={() => {
                          setVerifyModalRec(rec);
                          setBaselineAmount(Number(rec.estimatedSavings).toString());
                          setActualAfter("0");
                        }}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] flex items-center space-x-1"
                      >
                        <FileCheck className="w-3 h-3" />
                        <span>Verify Savings</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* AI Grounded Explanation Drawer */}
      {selectedRec && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-indigo-600 uppercase flex items-center space-x-1">
                    <Sparkles className="w-3 h-3" />
                    <span>AI Analysis & Business Justification</span>
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedRec.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedRec(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {explaining ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Generating grounded executive summary and action plan...
              </div>
            ) : aiExplanation ? (
              <div className="space-y-4 text-xs text-slate-700">
                <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-200/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-indigo-700">
                    Executive Summary
                  </span>
                  <p className="text-slate-800 font-medium">
                    {aiExplanation.executiveSummary}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-slate-900 uppercase text-[11px]">
                    Financial Justification & Assumptions
                  </span>
                  <p className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-600">
                    {aiExplanation.financialJustification}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-slate-900 uppercase text-[11px]">
                    Risk Assessment
                  </span>
                  <p className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-600">
                    {aiExplanation.riskAssessment}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-slate-900 uppercase text-[11px]">
                    Suggested Implementation Steps
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    {aiExplanation.suggestedActionPlan?.map((step: string, idx: number) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-slate-900 uppercase text-[11px]">
                    Key Investigation Questions
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    {aiExplanation.investigationQuestions?.map((q: string, idx: number) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                </div>

                <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 flex justify-between">
                  <span>Engine: {aiExplanation.providerUsed}</span>
                  <span>Non-authoritative explanation layer</span>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRec(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Realized Savings Modal (Critical Spec Requirement Section 14 & 16.4) */}
      {verifyModalRec && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Verify & Record Realized Savings
                </h2>
                <p className="text-xs text-slate-500">
                  Measure baseline cost vs actual invoice outlays to confirm realized savings
                </p>
              </div>
              <button
                onClick={() => setVerifyModalRec(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {verifyError && (
              <div className="p-3 rounded-lg bg-rose-50 text-rose-800 text-xs border border-rose-200">
                {verifyError}
              </div>
            )}

            <form onSubmit={handleVerifySubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Action Taken
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. De-provisioned unassigned seats from vendor admin portal"
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Baseline Monthly Spend ($)
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={baselineAmount}
                    onChange={(e) => setBaselineAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Actual Post-Action Spend ($)
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={actualAfter}
                    onChange={(e) => setActualAfter(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Verification Method
                </label>
                <input
                  required
                  type="text"
                  value={verificationMethod}
                  onChange={(e) => setVerificationMethod(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Evidence Reference (Invoice # or Bank Statement)
                </label>
                <input
                  required
                  type="text"
                  value={evidenceReference}
                  onChange={(e) => setEvidenceReference(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Audit Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVerifyModalRec(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVerify}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
                >
                  {submittingVerify ? "Verifying..." : "Confirm & Record Outcome"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

