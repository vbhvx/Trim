"use client";

import React, { useState } from "react";
import {
  TrendingDown,
  Building2,
  Shield,
  UserCheck,
  ChevronDown,
  RefreshCw,
  LogOut,
  AlertCircle,
} from "lucide-react";

interface HeaderProps {
  currentRole: string;
  onRoleChange: (role: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  organizationName: string;
  userName: string;
}

const ROLES = [
  { id: "ORGANIZATION_OWNER", label: "Organization Owner", desc: "Full permissions" },
  { id: "ADMIN", label: "Admin", desc: "Configuration & imports" },
  { id: "FINANCE_MANAGER", label: "Finance Manager", desc: "Invoices & savings verification" },
  { id: "ENGINEERING_MANAGER", label: "Engineering Manager", desc: "AI spend & technical review" },
  { id: "IT_ADMIN", label: "IT / SaaS Administrator", desc: "Licenses & inventory" },
  { id: "ANALYST_VIEWER", label: "Analyst / Viewer", desc: "Read-only access" },
];

export function Header({
  currentRole,
  onRoleChange,
  activeTab,
  setActiveTab,
  organizationName,
  userName,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleRoleSelect = async (roleId: string) => {
    setSwitching(true);
    setDropdownOpen(false);
    try {
      const res = await fetch("/api/v1/auth/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: roleId }),
      });
      if (res.ok) {
        onRoleChange(roleId);
      }
    } catch (err) {
      console.error("Failed to switch role", err);
    } finally {
      setSwitching(false);
    }
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "subscriptions", label: "Subscriptions", icon: "📦" },
    { id: "ai-explorer", label: "AI Spend", icon: "⚡" },
    { id: "invoices", label: "Invoices & Recon", icon: "🧾" },
    { id: "recommendations", label: "Recommendations", icon: "💡" },
    { id: "ingestion", label: "CSV Ingestion", icon: "📥" },
    { id: "integrations", label: "Integrations", icon: "🔌" },
  ];

  const currentRoleObj = ROLES.find((r) => r.id === currentRole) || ROLES[0];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <TrendingDown className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  Trim
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Intelligence
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                AI & SaaS Cost Optimization Platform
              </p>
            </div>
          </div>

          {/* Org & Live Role Switcher (Crucial for test evaluation of RBAC permissions) */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>{organizationName}</span>
            </div>

            {/* Role Switcher Pill */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={switching}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100/80 text-indigo-900 border border-indigo-200 text-xs font-semibold transition shadow-sm"
              >
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                <span>Role: {currentRoleObj.label}</span>
                <ChevronDown className="w-3.5 h-3.5 text-indigo-500" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-xs font-semibold text-slate-900">
                      Switch Active Role
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Test organization-level RBAC boundaries live
                    </p>
                  </div>
                  <div className="py-1">
                    {ROLES.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleRoleSelect(r.id)}
                        className={`w-full text-left px-3 py-2 text-xs flex flex-col hover:bg-slate-50 transition ${
                          currentRole === r.id
                            ? "bg-indigo-50/70 text-indigo-900 font-semibold"
                            : "text-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{r.label}</span>
                          {currentRole === r.id && (
                            <span className="text-[10px] text-indigo-600 font-bold uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {r.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="flex items-center space-x-2 border-l border-slate-200 pl-4 text-xs">
              <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                {userName.charAt(0)}
              </div>
              <span className="font-medium text-slate-700 hidden lg:inline">
                {userName}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto py-2 border-t border-slate-100 no-scrollbar">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

