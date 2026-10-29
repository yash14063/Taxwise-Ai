import React, { useState } from "react";
import {
  Search,
  Plus,
  Trash2,
  Download,
  CheckCircle2,
  PauseCircle,
  Upload,
} from "lucide-react";
import {
  IndividualProfile,
  RbiLedgerEntry,
  TaxSection,
} from "../types/tax";
import { formatInr } from "../utils/taxEngine";

interface RbiLedgerWorkspaceProps {
  profile: IndividualProfile;
  onToggleConsent: (consentId: string) => void;
  onUpdateEntrySection: (entryId: string, section: TaxSection) => void;
  onAddLedgerEntry: (entry: Omit<RbiLedgerEntry, "id">) => void;
  onDeleteLedgerEntry: (entryId: string) => void;
  onImportSampleCsvBatch: () => void;
  onExportCsv: () => void;
}

const ALL_TAX_SECTIONS = Object.values(TaxSection);

export const RbiLedgerWorkspace: React.FC<RbiLedgerWorkspaceProps> = ({
  profile,
  onToggleConsent,
  onUpdateEntrySection,
  onAddLedgerEntry,
  onDeleteLedgerEntry,
  onImportSampleCsvBatch,
  onExportCsv,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [flowFilter, setFlowFilter] = useState<"ALL" | "CREDIT" | "DEBIT" | "HOLDING">("ALL");
  const [showAddForm, setShowAddForm] = useState(false);

  // Add Entry Form State
  const [newDate, setNewDate] = useState("2026-10-29");
  const [newFip, setNewFip] = useState(
    profile.consents[0]?.fipName || "Manual Bank Statement"
  );
  const [newNarration, setNewNarration] = useState("");
  const [newFlow, setNewFlow] = useState<"CREDIT" | "DEBIT" | "HOLDING">("DEBIT");
  const [newAmount, setNewAmount] = useState("25000");
  const [newSection, setNewSection] = useState<TaxSection>(TaxSection.DED_80D_SELF);

  const activeFipSet = new Set(
    profile.consents.filter((c) => c.active).map((c) => c.fipName)
  );

  const filteredLedger = profile.ledger.filter((entry) => {
    if (flowFilter !== "ALL" && entry.flowType !== flowFilter) return false;
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const match =
        entry.narration.toLowerCase().includes(q) ||
        entry.fipName.toLowerCase().includes(q) ||
        entry.mappedSection.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmt = Number(newAmount);
    if (!newNarration.trim() || Number.isNaN(numericAmt) || numericAmt === 0) {
      return;
    }
    onAddLedgerEntry({
      date: newDate,
      fipName: newFip,
      maskedAccount: "MANUAL-AA",
      narration: newNarration.trim().toUpperCase(),
      flowType: newFlow,
      amount: numericAmt,
      mappedSection: newSection,
      verifiedByAa: false,
    });
    setNewNarration("");
    setShowAddForm(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            Sahamati RBI Account Aggregator Specification · FIP-FIU Encrypted Stream
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
            RBI Financial Ledger &amp; FIP Consents
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onImportSampleCsvBatch}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Sync Q3 AA Statement Delta</span>
          </button>
          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0F766E] rounded-lg hover:bg-[#115E59] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Ledger Entry</span>
          </button>
        </div>
      </div>

      {/* Connected FIP Consents Strip */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Connected Financial Information Providers (FIPs)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Toggle any RBI AA consent handle to include or exclude its ledger stream from real-time tax calculation.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {profile.consents.map((consent) => (
            <div
              key={consent.id}
              className="p-5 flex items-start justify-between gap-4"
            >
              <div className="space-y-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {consent.fipName}
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  {consent.maskedAccount} · {consent.fiType}
                </div>
                <div className="text-[11px] text-slate-500">
                  Handle {consent.aaHandle} · Synced {consent.lastSynced}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleConsent(consent.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  consent.active
                    ? "border-slate-200 bg-slate-50 text-[#16A34A] hover:bg-slate-100"
                    : "border-amber-200 bg-amber-50/50 text-[#D97706] hover:bg-amber-100/50"
                }`}
              >
                {consent.active ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Active</span>
                  </>
                ) : (
                  <>
                    <PauseCircle className="w-3.5 h-3.5" />
                    <span>Paused</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Optional Add Ledger Entry Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateEntry}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Log Manual or Simulated Ledger Transaction
            </h2>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                required
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Bank / Depository Narration
              </label>
              <input
                type="text"
                placeholder="e.g. LIC JEEVAN PREMIUM or FREELANCE INVOICE"
                value={newNarration}
                onChange={(e) => setNewNarration(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Flow Type
              </label>
              <select
                value={newFlow}
                onChange={(e) =>
                  setNewFlow(e.target.value as "CREDIT" | "DEBIT" | "HOLDING")
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              >
                <option value="DEBIT">DEBIT (Outflow / Deduction)</option>
                <option value="CREDIT">CREDIT (Income / Gain)</option>
                <option value="HOLDING">HOLDING (Unrealized Folio)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Amount (INR)
              </label>
              <input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Source FIP
              </label>
              <input
                type="text"
                value={newFip}
                onChange={(e) => setNewFip(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Statutory Tax Classification
              </label>
              <select
                value={newSection}
                onChange={(e) => setNewSection(e.target.value as TaxSection)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              >
                {ALL_TAX_SECTIONS.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium text-white bg-[#0F766E] rounded-lg hover:bg-[#115E59] transition-colors whitespace-nowrap shrink-0"
              >
                Save Transaction to Ledger
              </button>
            </div>
          </div>
        </form>
      )}

      {/* High-Density Data Grid */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search narration, FIP provider, or section..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            {(["ALL", "CREDIT", "DEBIT", "HOLDING"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFlowFilter(type)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  flowFilter === type
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {type === "ALL"
                  ? "All Entries"
                  : type === "CREDIT"
                  ? "Credits"
                  : type === "DEBIT"
                  ? "Debits"
                  : "Folio Holdings"}
              </button>
            ))}
          </div>
        </div>

        {filteredLedger.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-900">
              No matching RBI ledger transactions
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Clear your search filter or add a new ledger transaction to evaluate its tax impact.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setFlowFilter("ALL");
                setShowAddForm(true);
              }}
              className="mt-4 px-4 py-2 text-xs font-medium text-white bg-[#0F766E] rounded-lg hover:bg-[#115E59] transition-colors"
            >
              Log First Entry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-medium text-slate-500 bg-slate-50/70">
                  <th className="py-2.5 px-5 whitespace-nowrap">Date</th>
                  <th className="py-2.5 px-4">Narration &amp; FIP Stream</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Flow</th>
                  <th className="py-2.5 px-4">Tax Section Mapping</th>
                  <th className="py-2.5 px-5 text-right whitespace-nowrap">
                    Amount (INR)
                  </th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredLedger.map((entry) => {
                  const isConsentPaused =
                    entry.verifiedByAa && !activeFipSet.has(entry.fipName);
                  return (
                    <tr
                      key={entry.id}
                      className={`h-11 hover:bg-slate-50/80 transition-colors ${
                        isConsentPaused ? "opacity-50" : ""
                      }`}
                    >
                      <td className="px-5 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {entry.date}
                      </td>
                      <td className="px-4 max-w-md">
                        <div className="font-medium text-slate-900 truncate">
                          {entry.narration}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {entry.fipName} · {entry.maskedAccount} ·{" "}
                          {entry.verifiedByAa
                            ? "Signed AA Artifact"
                            : "Simulated / Manual"}
                        </div>
                      </td>
                      <td className="px-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                        {entry.flowType}
                      </td>
                      <td className="px-4">
                        <select
                          aria-label={`Map tax section for ${entry.narration}`}
                          value={entry.mappedSection}
                          onChange={(e) =>
                            onUpdateEntrySection(
                              entry.id,
                              e.target.value as TaxSection
                            )
                          }
                          className={`px-2.5 py-1 text-xs border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E] ${
                            entry.mappedSection === TaxSection.UNMAPPED
                              ? "border-amber-300 text-[#D97706] font-medium"
                              : "border-slate-200 text-slate-800"
                          }`}
                        >
                          {ALL_TAX_SECTIONS.map((sec) => (
                            <option key={sec} value={sec}>
                              {sec}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 text-right font-mono tabular-nums font-medium text-slate-900 whitespace-nowrap">
                        {formatInr(entry.amount)}
                      </td>
                      <td className="px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteLedgerEntry(entry.id)}
                          title="Remove row from ledger"
                          className="p-1.5 text-slate-400 hover:text-[#DC2626] rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
