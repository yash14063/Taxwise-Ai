/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import {
  LayoutGrid,
  FileText,
  SlidersHorizontal,
  UserPlus,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { INITIAL_PROFILES } from "./data/profiles";
import {
  AiAuditResponse,
  DeterministicOptimizationMove,
  IndividualAiModelConfig,
  IndividualProfile,
  RbiLedgerEntry,
  TaxSection,
} from "./types/tax";
import { evaluateProfileTax, formatInr } from "./utils/taxEngine";
import { AvatarImage } from "./components/AvatarImage";
import { OverviewWorkspace } from "./components/OverviewWorkspace";
import { RbiLedgerWorkspace } from "./components/RbiLedgerWorkspace";
import { IndividualAiStudio } from "./components/IndividualAiStudio";
import { NewProfileModal } from "./components/NewProfileModal";

type ActiveTab = "overview" | "ledger" | "ai-model";

export default function App() {
  const [profiles, setProfiles] = useState<IndividualProfile[]>(INITIAL_PROFILES);
  const [BaselineSnapshots] = useState<Record<string, RbiLedgerEntry[]>>(() => {
    const map: Record<string, RbiLedgerEntry[]> = {};
    for (const p of INITIAL_PROFILES) {
      map[p.id] = p.ledger.map((r) => ({ ...r }));
    }
    return map;
  });

  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    INITIAL_PROFILES[0].id
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showNewProfileModal, setShowNewProfileModal] = useState(false);

  // Track applied deterministic simulations per profile
  const [appliedMovesByProfile, setAppliedMovesByProfile] = useState<
    Record<string, string[]>
  >({});

  // Track Gemini AI Audit results per profile
  const [aiAuditByProfile, setAiAuditByProfile] = useState<
    Record<string, AiAuditResponse>
  >({});
  const [aiAuditLoading, setAiAuditLoading] = useState(false);
  const [aiAuditError, setAiAuditError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeProfile = useMemo(
    () =>
      profiles.find((p) => p.id === selectedProfileId) || profiles[0],
    [profiles, selectedProfileId]
  );

  const taxResult = useMemo(
    () => evaluateProfileTax(activeProfile),
    [activeProfile]
  );

  const showNotice = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  const updateActiveProfile = (
    updater: (prev: IndividualProfile) => IndividualProfile
  ) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === activeProfile.id ? updater(p) : p))
    );
  };

  const handleApplyMove = (move: DeterministicOptimizationMove) => {
    updateActiveProfile((p) => {
      let nextLedger = [...p.ledger];
      if (move.reclassifyEntryId) {
        nextLedger = nextLedger.map((entry) =>
          entry.id === move.reclassifyEntryId
            ? { ...entry, mappedSection: move.section }
            : entry
        );
      } else {
        nextLedger.unshift({
          ...move.simulationEntry,
          id: `sim-${Date.now()}`,
        });
      }
      return { ...p, ledger: nextLedger };
    });

    setAppliedMovesByProfile((prev) => ({
      ...prev,
      [activeProfile.id]: [...(prev[activeProfile.id] || []), move.id],
    }));

    showNotice(`Simulated "${move.title}" in RBI Ledger.`);
  };

  const handleResetSimulations = () => {
    const baseline = BaselineSnapshots[activeProfile.id];
    if (baseline) {
      updateActiveProfile((p) => ({
        ...p,
        ledger: baseline.map((r) => ({ ...r })),
      }));
    } else {
      updateActiveProfile((p) => ({
        ...p,
        ledger: p.ledger.filter((r) => r.verifiedByAa),
      }));
    }
    setAppliedMovesByProfile((prev) => ({
      ...prev,
      [activeProfile.id]: [],
    }));
    showNotice("Restored signed RBI Account Aggregator baseline ledger.");
  };

  const handleToggleConsent = (consentId: string) => {
    updateActiveProfile((p) => ({
      ...p,
      consents: p.consents.map((c) =>
        c.id === consentId ? { ...c, active: !c.active } : c
      ),
    }));
  };

  const handleUpdateEntrySection = (entryId: string, section: TaxSection) => {
    updateActiveProfile((p) => ({
      ...p,
      ledger: p.ledger.map((row) =>
        row.id === entryId ? { ...row, mappedSection: section } : row
      ),
    }));
  };

  const handleAddLedgerEntry = (entry: Omit<RbiLedgerEntry, "id">) => {
    updateActiveProfile((p) => ({
      ...p,
      ledger: [{ ...entry, id: `man-${Date.now()}` }, ...p.ledger],
    }));
    showNotice("Added transaction & recalculated tax liability.");
  };

  const handleDeleteLedgerEntry = (entryId: string) => {
    updateActiveProfile((p) => ({
      ...p,
      ledger: p.ledger.filter((r) => r.id !== entryId),
    }));
  };

  const handleImportSampleCsvBatch = () => {
    const fipName =
      activeProfile.consents[0]?.fipName || "HDFC Bank FIP";
    const batch: RbiLedgerEntry[] = [
      {
        id: `aa-q3-1-${Date.now()}`,
        date: "2026-10-25",
        fipName,
        maskedAccount: activeProfile.consents[0]?.maskedAccount || "XXXX-4821",
        narration: "APOLLO DIAGNOSTICS MASTER PREVENTIVE HEALTH CHECKUP",
        flowType: "DEBIT",
        amount: 5000,
        mappedSection: TaxSection.DED_80D_SELF,
        verifiedByAa: true,
      },
      {
        id: `aa-q3-2-${Date.now()}`,
        date: "2026-10-27",
        fipName,
        maskedAccount: activeProfile.consents[0]?.maskedAccount || "XXXX-4821",
        narration: "PM NATIONAL RELIEF FUND 80G RECEIPT #88412",
        flowType: "DEBIT",
        amount: 15000,
        mappedSection: TaxSection.DED_80G,
        verifiedByAa: true,
      },
    ];
    updateActiveProfile((p) => ({
      ...p,
      ledger: [...batch, ...p.ledger],
    }));
    showNotice("Synced 2 new verified RBI AA statement entries.");
  };

  const handleUpdateModelConfig = (patch: Partial<IndividualAiModelConfig>) => {
    updateActiveProfile((p) => ({
      ...p,
      aiModel: {
        ...p.aiModel,
        ...patch,
      },
    }));
  };

  const handleRunAiAudit = async () => {
    setAiAuditLoading(true);
    setAiAuditError(null);
    setActiveTab("overview");

    try {
      const response = await fetch("/api/tax-ai/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: activeProfile,
          taxSummary: {
            grossIncome: taxResult.grossIncome,
            oldRegimeTax: taxResult.oldRegimeTax,
            newRegimeTax: taxResult.newRegimeTax,
            optimalRegime: taxResult.optimalRegime,
            regimeDiffSavings: taxResult.regimeDiffSavings,
            used80C: taxResult.used80C,
            used80D: taxResult.used80D,
            used80CCD1B: taxResult.used80CCD1B,
            used80CCD2: taxResult.used80CCD2New,
            realizedLtcg: taxResult.realizedLtcg,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate AI tax audit.");
      }

      setAiAuditByProfile((prev) => ({
        ...prev,
        [activeProfile.id]: data as AiAuditResponse,
      }));
    } catch (err: unknown) {
      setAiAuditError(
        err instanceof Error
          ? err.message
          : "Unexpected error during AI tax audit."
      );
    } finally {
      setAiAuditLoading(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "Date",
      "FIP Provider",
      "Masked Account",
      "Flow Type",
      "Amount INR",
      "Tax Section",
      "Verification",
      "Narration",
    ];
    const rows = activeProfile.ledger.map((r) => [
      r.date,
      `"${r.fipName.replace(/"/g, '""')}"`,
      r.maskedAccount,
      r.flowType,
      r.amount,
      `"${r.mappedSection}"`,
      r.verifiedByAa ? "RBI_AA_SIGNED" : "SIMULATED",
      `"${r.narration.replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${activeProfile.fullName.toLowerCase().replace(/\s+/g, "_")}_rbi_tax_schedule.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotice("Downloaded Chartered Accountant Tax Schedule CSV.");
  };

  const handleCreateProfile = (newProfile: IndividualProfile) => {
    setProfiles((prev) => [...prev, newProfile]);
    setSelectedProfileId(newProfile.id);
    setShowNewProfileModal(false);
    setActiveTab("overview");
    showNotice(`Initialized RBI AA ledger & AI model for ${newProfile.fullName}.`);
  };

  const tabLabel =
    activeTab === "overview"
      ? "Tax Optimization"
      : activeTab === "ledger"
      ? "RBI AA Ledger"
      : "Individual AI Model";

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-64 shrink-0">
      {/* Brand Wordmark */}
      <div className="h-14 px-5 border-b border-slate-200 flex items-center justify-between">
        <span className="text-base font-bold tracking-tight text-slate-900 font-display whitespace-nowrap">
          ArthaLedger
        </span>
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
          className="lg:hidden p-1 text-slate-500 hover:text-slate-900"
          aria-label="Close navigation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Workspace Navigation */}
      <div className="p-3 space-y-1">
        <button
          type="button"
          onClick={() => {
            setActiveTab("overview");
            setMobileSidebarOpen(false);
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeTab === "overview"
              ? "bg-slate-900 text-white"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <LayoutGrid className="w-4 h-4 shrink-0" />
          <span>Tax Optimization</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("ledger");
            setMobileSidebarOpen(false);
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeTab === "ledger"
              ? "bg-slate-900 text-white"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>RBI Financial Ledger</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("ai-model");
            setMobileSidebarOpen(false);
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeTab === "ai-model"
              ? "bg-slate-900 text-white"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4 shrink-0" />
          <span>Individual AI Model</span>
        </button>
      </div>

      {/* Individual Taxpayer Switcher */}
      <div className="mt-4 pt-4 border-t border-slate-200 px-3 flex-1 overflow-y-auto">
        <div className="px-2 mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Individuals ({profiles.length})
          </span>
          <button
            type="button"
            onClick={() => {
              setShowNewProfileModal(true);
              setMobileSidebarOpen(false);
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#0F766E] hover:text-[#115E59]"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        <div className="space-y-1">
          {profiles.map((person) => {
            const selected = person.id === activeProfile.id;
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => {
                  setSelectedProfileId(person.id);
                  setAiAuditError(null);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full text-left p-2.5 rounded-lg flex items-center gap-3 transition-colors ${
                  selected
                    ? "bg-[#0F766E]/10 text-slate-900"
                    : "hover:bg-slate-100 text-slate-700"
                }`}
              >
                <AvatarImage
                  src={person.avatarUrl}
                  alt={`${person.fullName} profile portrait`}
                  fullName={person.fullName}
                  sizeClass="w-8 h-8"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate">
                    {person.fullName}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {person.archetype}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quiet Summary Footer in Sidebar */}
      <div className="p-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
        <div className="flex items-center justify-between">
          <span>Optimal Payable</span>
          <span className="font-mono tabular-nums font-semibold text-slate-900">
            {formatInr(taxResult.optimalTax)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Model Savings</span>
          <span className="font-mono tabular-nums font-semibold text-[#16A34A]">
            {formatInr(taxResult.regimeDiffSavings + taxResult.totalUnlockableAlpha)}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-[#0F172A]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Strict SaaS Top Bar Contract: Breadcrumb on left, 1 primary CTA on right */}
        <header className="h-14 px-6 bg-white border-b border-slate-200 flex items-center justify-between gap-8 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 -ml-1.5 text-slate-600 hover:text-slate-900 rounded-md"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 text-xs text-slate-500 truncate"
            >
              <span className="font-medium text-slate-900 lg:hidden">
                ArthaLedger
              </span>
              <span className="lg:hidden" aria-hidden="true">
                /
              </span>
              <span className="truncate">{activeProfile.fullName}</span>
              <span aria-hidden="true">/</span>
              <span className="font-medium text-slate-900 truncate">
                {tabLabel}
              </span>
            </nav>
          </div>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleRunAiAudit}
              disabled={aiAuditLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {aiAuditLoading ? "Auditing Ledger..." : "Run AI Tax Audit"}
              </span>
            </button>
          </div>
        </header>

        {/* Action Feedback Banner */}
        {toastMessage && (
          <div className="bg-slate-900 text-white text-xs px-6 py-2.5 flex items-center justify-between">
            <span>{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-300 hover:text-white ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Workspace Viewport */}
        <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-8 py-8">
          {activeTab === "overview" && (
            <OverviewWorkspace
              profile={activeProfile}
              taxResult={taxResult}
              appliedMoveIds={appliedMovesByProfile[activeProfile.id] || []}
              onApplyMove={handleApplyMove}
              onResetSimulations={handleResetSimulations}
              aiAudit={aiAuditByProfile[activeProfile.id] || null}
              aiAuditLoading={aiAuditLoading}
              aiAuditError={aiAuditError}
              onRunAiAudit={handleRunAiAudit}
              onNavigateTab={setActiveTab}
              onExportCsv={handleExportCsv}
            />
          )}

          {activeTab === "ledger" && (
            <RbiLedgerWorkspace
              profile={activeProfile}
              onToggleConsent={handleToggleConsent}
              onUpdateEntrySection={handleUpdateEntrySection}
              onAddLedgerEntry={handleAddLedgerEntry}
              onDeleteLedgerEntry={handleDeleteLedgerEntry}
              onImportSampleCsvBatch={handleImportSampleCsvBatch}
              onExportCsv={handleExportCsv}
            />
          )}

          {activeTab === "ai-model" && (
            <IndividualAiStudio
              profile={activeProfile}
              taxResult={taxResult}
              onUpdateModelConfig={handleUpdateModelConfig}
              onRunAiAudit={handleRunAiAudit}
            />
          )}
        </main>

        {/* Quiet Factual Footer */}
        <footer className="px-4 sm:px-8 py-5 border-t border-slate-200 text-xs text-slate-500 max-w-[1280px] w-full mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>
            ArthaLedger · Indian Income Tax Computation Engine (FY 2026-27 / AY 2027-28)
          </span>
          <span>
            Sahamati RBI Account Aggregator FIP-FIU Schema · Verify final ITR schedules with a Chartered Accountant
          </span>
        </footer>
      </div>

      {showNewProfileModal && (
        <NewProfileModal
          onClose={() => setShowNewProfileModal(false)}
          onCreateProfile={handleCreateProfile}
        />
      )}
    </div>
  );
}
