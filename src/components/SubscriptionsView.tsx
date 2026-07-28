"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Filter,
  Users,
  Calendar,
  AlertCircle,
  Clock,
  ArrowUpDown,
  ExternalLink,
  X,
  CheckCircle,
} from "lucide-react";
import { formatMoney } from "@/lib/financial/decimal";

interface SubscriptionsViewProps {
  userRole: string;
}

export function SubscriptionsView({ userRole }: SubscriptionsViewProps) {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [vendorId, setVendorId] = useState("");
  const [productName, setProductName] = useState("");
  const [planName, setPlanName] = useState("Standard");
  const [billingInterval, setBillingInterval] = useState("MONTHLY");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [seatQuantity, setSeatQuantity] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subsRes, vendorsRes] = await Promise.all([
        fetch(`/api/v1/subscriptions?search=${encodeURIComponent(search)}`),
        fetch("/api/v1/vendors"),
      ]);
      const subsData = await subsRes.json();
      const vendorsData = await vendorsRes.json();
      if (subsData.success) setSubscriptions(subsData.data || []);
      if (vendorsData.success) setVendors(vendorsData.data || []);
    } catch (err) {
      console.error("Failed to fetch subscriptions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const handleCreateSub = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/v1/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId,
          productName,
          planName,
          billingInterval,
          expectedAmount: parseFloat(expectedAmount),
          seatQuantity: seatQuantity ? parseInt(seatQuantity, 10) : null,
          renewalAt: renewalDate || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setProductName("");
        setExpectedAmount("");
        setSeatQuantity("");
        fetchData();
      } else {
        setErrorMsg(data.error?.message || "Failed to create subscription");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Subscription & Vendor Inventory
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Normalized SaaS commitments, seat utilization rates, and renewal timelines
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search vendor or product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition w-60"
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subscription</span>
          </button>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Vendor & Product</th>
                <th className="px-5 py-3">Plan Tier</th>
                <th className="px-5 py-3">Billing Interval</th>
                <th className="px-5 py-3">Contract Rate</th>
                <th className="px-5 py-3">Normalized Monthly</th>
                <th className="px-5 py-3">Seat Allocation</th>
                <th className="px-5 py-3">Renewal Date</th>
                <th className="px-5 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Loading subscription inventory...
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No subscriptions found matching query.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => {
                  const isRenewingSoon =
                    sub.renewalAt &&
                    new Date(sub.renewalAt).getTime() - Date.now() <
                      30 * 24 * 60 * 60 * 1000 &&
                    new Date(sub.renewalAt).getTime() > Date.now();

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-50/70 transition cursor-pointer"
                      onClick={() => setSelectedSub(sub)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">
                          {sub.productName}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {sub.vendor?.name} • {sub.vendor?.category}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          {sub.planName}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-slate-600 font-semibold uppercase text-[11px]">
                          {sub.billingInterval}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-900">
                        {formatMoney(sub.expectedAmount, sub.billingCurrency)}
                      </td>
                      <td className="px-5 py-3 font-bold text-blue-900">
                        {formatMoney(sub.normalizedMonthlyCost)}/mo
                      </td>
                      <td className="px-5 py-3">
                        {sub.seatQuantity !== null ? (
                          <div className="flex items-center space-x-1.5 text-slate-700">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {sub._count?.licenses ?? 0} / {sub.seatQuantity} seats
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">
                            Unmetered / Usage
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {sub.renewalAt ? (
                          <span
                            className={`inline-flex items-center space-x-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              isRenewingSoon
                                ? "bg-amber-100 text-amber-900 border border-amber-200"
                                : "text-slate-600 bg-slate-100"
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            <span>{sub.renewalAt.split("T")[0]}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">N/A</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSub(sub);
                          }}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                        >
                          Inspect →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subscription Detail Drawer Modal */}
      {selectedSub && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                  {selectedSub.vendor?.category}
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                  {selectedSub.productName}
                </h2>
                <p className="text-xs text-slate-500">
                  Vendor: {selectedSub.vendor?.name} • ID: {selectedSub.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Normalization Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400">Contract Amount</span>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {formatMoney(selectedSub.expectedAmount)}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Billing Interval</span>
                <div className="text-sm font-bold text-slate-900 mt-0.5 uppercase">
                  {selectedSub.billingInterval}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Normalized Monthly</span>
                <div className="text-sm font-bold text-blue-600 mt-0.5">
                  {formatMoney(selectedSub.normalizedMonthlyCost)}/mo
                </div>
              </div>
            </div>

            {/* Seat Utilization & Critical Spec Rule Check */}
            {selectedSub.seatQuantity && (
              <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase">
                    Seat Utilization Metrics
                  </h4>
                  <span className="text-xs font-semibold text-slate-500">
                    {selectedSub.seatQuantity} Total Purchased Seats
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500">Assigned Seats</span>
                    <p className="text-base font-bold text-slate-900">
                      {selectedSub._count?.licenses ?? 0}
                    </p>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <span className="text-amber-700">Unassigned Paid</span>
                    <p className="text-base font-bold text-amber-900">
                      {Math.max(
                        0,
                        selectedSub.seatQuantity - (selectedSub._count?.licenses ?? 0)
                      )}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500">Seat Price / Mo</span>
                    <p className="text-base font-bold text-slate-900">
                      {formatMoney(
                        selectedSub.seatQuantity > 0
                          ? Number(selectedSub.normalizedMonthlyCost) / selectedSub.seatQuantity
                          : 0
                      )}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  ⚠️ Note: Seats without vendor activity timestamps are preserved as &quot;Activity: Unknown&quot; and never falsely reported as unused.
                </p>
              </div>
            )}

            {/* Calculation Provenance & Assumptions */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase">
                Calculation Assumptions
              </h4>
              <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <li>Method: {selectedSub.calculationMethod || "Direct recurring rate"}</li>
                <li>Amortization: Contract period evenly distributed across calendar months</li>
                <li>Cash flow outlay remains distinct from analytical recurring run-rate</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedSub(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Subscription Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Add Subscription Record
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 text-rose-800 text-xs border border-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateSub} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Vendor
                </label>
                <select
                  required
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Select Vendor...</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Product Name
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. GitHub Enterprise Cloud"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Plan Tier
                  </label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Billing Interval
                  </label>
                  <select
                    value={billingInterval}
                    onChange={(e) => setBillingInterval(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="ANNUAL">Annual</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="USAGE_BASED">Usage-Based</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Expected Rate ($)
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1200.00"
                    value={expectedAmount}
                    onChange={(e) => setExpectedAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Purchased Seats (optional)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    value={seatQuantity}
                    onChange={(e) => setSeatQuantity(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Contract Renewal Date
                </label>
                <input
                  type="date"
                  value={renewalDate}
                  onChange={(e) => setRenewalDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"
                >
                  {submitting ? "Saving..." : "Save Subscription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

