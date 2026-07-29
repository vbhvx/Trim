"use client";

import React, { useState, useEffect } from "react";
import {
  Plug,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Lock,
  ExternalLink,
  ShieldCheck,
  X,
} from "lucide-react";

interface IntegrationsViewProps {
  userRole: string;
}

export function IntegrationsView({ userRole }: IntegrationsViewProps) {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [supported, setSupported] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Connect Modal State
  const [connectProvider, setConnectProvider] = useState<any | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/integrations");
      const data = await res.json();
      if (data.success) {
        setIntegrations(data.data.activeConnections || []);
        setSupported(data.data.supportedProviders || []);
      }
    } catch (err) {
      console.error("Failed to load integrations", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleSync = async (id: string) => {
    setSyncingId(id);
    try {
      const res = await fetch(`/api/v1/integrations/${id}/sync`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        fetchIntegrations();
      } else {
        alert(data.error?.message || "Sync failed");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSyncingId(null);
    }
  };

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectProvider) return;
    setConnecting(true);
    setConnectError("");
    try {
      const res = await fetch(
        `/api/v1/integrations/${connectProvider.provider.toLowerCase()}/connect`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setConnectProvider(null);
        setApiKey("");
        fetchIntegrations();
      } else {
        setConnectError(data.error?.message || "Failed to connect integration");
      }
    } catch (err: any) {
      setConnectError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Vendor & Cloud Integrations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Connect billing APIs and telemetry exports securely. All secrets encrypted server-side.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Server-Side Secret Store Active</span>
        </div>
      </div>

      {/* Grid of Providers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {supported.map((prov) => {
          const activeConn = integrations.find((c) => c.provider === prov.provider);
          const isConnected = !!activeConn && activeConn.connectionStatus === "ACTIVE";

          return (
            <div
              key={prov.provider}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-300 transition"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-600 uppercase">
                    {prov.category}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isConnected
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {prov.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct telemetry & invoice ingestion connector
                </p>
              </div>

              {isConnected && (
                <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  Last Synced:{" "}
                  <strong>
                    {new Date(activeConn.lastSuccessfulSyncAt).toLocaleTimeString()}
                  </strong>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                {isConnected ? (
                  <button
                    onClick={() => handleSync(activeConn.id)}
                    disabled={syncingId === activeConn.id}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${
                        syncingId === activeConn.id ? "animate-spin" : ""
                      }`}
                    />
                    <span>
                      {syncingId === activeConn.id ? "Syncing..." : "Sync Now"}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setConnectProvider(prov);
                      setConnectError("");
                      setApiKey("");
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition text-xs font-semibold"
                  >
                    Connect Provider →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Connect API Key Modal */}
      {connectProvider && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Connect {connectProvider.name}
                </h2>
                <p className="text-xs text-slate-500">
                  Enter API token with read-only cost and usage scopes
                </p>
              </div>
              <button
                onClick={() => setConnectProvider(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {connectError && (
              <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-200">
                {connectError}
              </div>
            )}

            <form onSubmit={handleConnectSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  API Key / Secret Token
                </label>
                <input
                  required
                  type="password"
                  placeholder="sk-live-... or bearer token"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-900 space-y-1">
                <div className="font-bold flex items-center space-x-1">
                  <Lock className="w-3.5 h-3.5 text-blue-700" />
                  <span>Security Guarantee (Section 17.2)</span>
                </div>
                <p>
                  Credentials are encrypted server-side and never exposed to browser or recorded in application logs.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConnectProvider(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={connecting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"
                >
                  {connecting ? "Connecting..." : "Confirm Connection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

