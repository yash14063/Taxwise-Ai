import React, { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  FileSpreadsheet,
  SlidersHorizontal,
} from "lucide-react";
import {
  AiAuditResponse,
  DeterministicOptimizationMove,
  IndividualProfile,
  TaxComputationResult,
} from "../types/tax";
import { formatInr } from "../utils/taxEngine";

interface OverviewWorkspaceProps {
  profile: IndividualProfile;
  taxResult: TaxComputationResult;
  appliedMoveIds: string[];
  onApplyMove: (move: DeterministicOptimizationMove) => void;
  onResetSimulations: () => void;
  aiAudit: AiAuditResponse | null;
  aiAuditLoading: boolean;
  aiAuditError: string | null;
  onRunAiAudit: () => void;
  onNavigateTab: (tab: "overview" | "ledger" | "ai-model") => void;
  onExportCsv: () => void;
}

export const OverviewWorkspace: React.FC<OverviewWorkspaceProps> = ({
  profile,
  taxResult,
  appliedMoveIds,
  onApplyMove,
  onResetSimulations,
  aiAudit,
  aiAuditLoading,
  aiAuditError,
  onRunAiAudit,
  onNavigateTab,
  onExportCsv,
}) => {
  const [slabTab, setSlabTab] = useState<"NEW" | "OLD" | "CAPS">("NEW");

  const activeConsentCount = profile.consents.filter((c) => c.active).length;
  const hasSimulations = profile.ledger.some((r) => !r.verifiedByAa);

  const deductionCaps = [
    {
      label: "Section 80C (EPF, PPF, ELSS)",
      used: taxResult.used80C,
      cap: 150000,
      note: "Old Regime",
    },
    {
      label: "Section 80CCD(2) Corporate NPS",
      used: taxResult.used80CCD2New,
      cap: Math.max(
        1,
        Math.round(
          taxResult.grossSalary *
            ((profile.aiModel.basicSalaryRatioPercent || 45) / 100) *
            0.14
        )
      ),
      note: "Both Regimes · 14% Basic in New",
    },
    {
      label: "Section 80D Family & Parents Health",
      used: taxResult.used80D,
      cap: 75000,
      note: "Old Regime · ₹25k Self + ₹50k Sr. Parents",
    },
    {
      label: "Section 112A Tax-Free Equity LTCG",
      used: Math.min(125000, Math.max(0, taxResult.realizedLtcg)),
      cap: 125000,
      note: "Both Regimes · Annual Exemption",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Contextual Individual Header Summary */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1.5">
            <span>{profile.assessmentYear}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{profile.panMasked}</span>
            <span aria-hidden="true">·</span>
            <span>{activeConsentCount} Active RBI AA FIP Consents</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">Model {profile.aiModel.modelCode}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
            Tax Position &amp; Ledger Optimization
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {hasSimulations && (
            <button
              type="button"
              onClick={onResetSimulations}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              Reset Simulated Moves
            </button>
          )}
          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CA Schedule CSV</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab("ai-model")}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>Calibrate Individual Model</span>
          </button>
        </div>
      </div>

      {/* 4-Column Full-Width Structured Metric Strip (Single-Elevation, Zero Nested Cards) */}
      <section className="bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">
            Gross RBI Ledger Inflows
          </div>
          <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-900">
            {formatInr(taxResult.grossIncome)}
          </div>
          <div className="mt-1.5 text-xs text-slate-500">
            {taxResult.grossProfessionalReceipts > 0
              ? `44ADA 50% Assessable: ${formatInr(taxResult.taxable44AdaIncome)}`
              : `Salary + Capital Gains + Interest`}
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">
              Old Regime Tax (incl. 4% Cess)
            </span>
            {taxResult.optimalRegime === "OLD_REGIME" && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#16A34A]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Optimal
              </span>
            )}
          </div>
          <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-900">
            {formatInr(taxResult.oldRegimeTax)}
          </div>
          <div className="mt-1.5 text-xs text-slate-500 font-mono tabular-nums">
            Effective Rate {taxResult.oldEffectiveRate}% · Taxable{" "}
            {formatInr(taxResult.oldTaxableNormalIncome)}
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">
              New Regime Tax (FY 2026-27)
            </span>
            {taxResult.optimalRegime === "NEW_REGIME" && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#16A34A]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Optimal
              </span>
            )}
          </div>
          <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-900">
            {formatInr(taxResult.newRegimeTax)}
          </div>
          <div className="mt-1.5 text-xs text-slate-500 font-mono tabular-nums">
            Effective Rate {taxResult.newEffectiveRate}% · Taxable{" "}
            {formatInr(taxResult.newTaxableNormalIncome)}
          </div>
        </div>

        <div className="p-5 bg-[#0F766E]/[0.03]">
          <div className="text-xs font-medium text-[#0F766E]">
            Regime Advantage + Model Alpha
          </div>
          <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-[#0F766E]">
            {formatInr(taxResult.regimeDiffSavings + taxResult.totalUnlockableAlpha)}
          </div>
          <div className="mt-1.5 text-xs text-slate-600 font-mono tabular-nums">
            {formatInr(taxResult.regimeDiffSavings)} regime delta ·{" "}
            {formatInr(taxResult.totalUnlockableAlpha)} ledger moves
          </div>
        </div>
      </section>

      {/* Main 2-Column Split: Left = Calibrated Individual AI Moves; Right = Slab & Deduction Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Columns: Individual AI Model Action Queue */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Calibrated Tax-Saving Actions from RBI Ledger
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Filtered by Liquidity Weight {profile.aiModel.liquidityWeight}/100 · Max Lock-In{" "}
                {profile.aiModel.lockInToleranceYears} yrs · {profile.aiModel.auditRigorLevel} Audit Trail
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("ledger")}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F766E] hover:text-[#115E59] whitespace-nowrap shrink-0"
            >
              <span>Inspect Raw FIP Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {taxResult.modelMoves.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <CheckCircle2 className="w-7 h-7 text-[#16A34A] mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-900">
                All deterministic RBI ledger deductions &amp; harvests are applied
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Run the Gemini Individual AI Audit below to check deeper structural restructuring or adjust your lock-in tolerance in the Model Studio.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {taxResult.modelMoves.map((move, idx) => {
                const isApplied = appliedMoveIds.includes(move.id);
                return (
                  <div
                    key={move.id}
                    className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono text-slate-400">
                          0{idx + 1}.
                        </span>
                        <span className="font-medium text-slate-700">
                          {move.section}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {move.regimeApplicability === "BOTH"
                            ? "Valid in Both Regimes"
                            : move.regimeApplicability === "NEW_REGIME"
                            ? "New Regime"
                            : "Old Regime"}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {move.lockInYears === 0
                            ? "Zero Lock-In"
                            : `${move.lockInYears} yr Lock-In`}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        {move.title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {move.rationale}
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <div className="text-xs text-slate-500">Est. Tax Saved</div>
                        <div className="text-base font-semibold font-mono tabular-nums text-[#16A34A]">
                          +{formatInr(move.estimatedTaxSaved)}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isApplied}
                        onClick={() => onApplyMove(move)}
                        className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                          isApplied
                            ? "bg-slate-100 text-slate-500 cursor-default"
                            : "bg-[#0F766E] text-white hover:bg-[#115E59]"
                        }`}
                      >
                        {isApplied ? "Applied to Ledger" : "Simulate in Ledger"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right 5 Columns: Slab & Statutory Cap Matrix */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900">
              Statutory Computation Matrix
            </h2>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setSlabTab("NEW")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  slabTab === "NEW"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                New Slabs
              </button>
              <button
                type="button"
                onClick={() => setSlabTab("OLD")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  slabTab === "OLD"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Old Slabs
              </button>
              <button
                type="button"
                onClick={() => setSlabTab("CAPS")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  slabTab === "CAPS"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sec Caps
              </button>
            </div>
          </div>

          {slabTab === "CAPS" ? (
            <div className="p-6 space-y-5">
              {deductionCaps.map((item) => {
                const pct = Math.min(100, Math.round((item.used / item.cap) * 100));
                return (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-800">
                        {item.label}
                      </span>
                      <span className="font-mono tabular-nums text-slate-600">
                        {formatInr(item.used)} / {formatInr(item.cap)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0F766E] transition-transform duration-200 origin-left"
                        style={{
                          transform: `scaleX(${pct / 100})`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{item.note}</span>
                      <span className="font-mono tabular-nums">{pct}% utilized</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-medium text-slate-500 bg-slate-50/60">
                    <th className="py-2.5 px-5">Income Bracket</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 text-right">Assessable</th>
                    <th className="py-2.5 px-5 text-right">Slab Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {(slabTab === "NEW" ? taxResult.newSlabs : taxResult.oldSlabs).map(
                    (row) => (
                      <tr key={row.slabLabel} className="h-10 hover:bg-slate-50/60">
                        <td className="px-5 font-medium text-slate-800 whitespace-nowrap">
                          {row.slabLabel}
                        </td>
                        <td className="px-3 text-right font-mono tabular-nums text-slate-500">
                          {row.ratePercent}%
                        </td>
                        <td className="px-3 text-right font-mono tabular-nums text-slate-600">
                          {formatInr(row.taxableSlice)}
                        </td>
                        <td className="px-5 text-right font-mono tabular-nums font-medium text-slate-900">
                          {formatInr(row.taxAmount)}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50/70 text-xs">
                  <tr className="h-9">
                    <td colSpan={3} className="px-5 text-slate-600">
                      Special Rate Capital Gains Tax (112A LTCG + 111A STCG)
                    </td>
                    <td className="px-5 text-right font-mono tabular-nums font-medium text-slate-900">
                      {formatInr(
                        slabTab === "NEW"
                          ? taxResult.newCapitalGainsTax
                          : taxResult.oldCapitalGainsTax
                      )}
                    </td>
                  </tr>
                  <tr className="h-10 border-t border-slate-200 font-semibold text-slate-900">
                    <td colSpan={3} className="px-5">
                      Total Tax Payable (incl. 4% Health &amp; Education Cess)
                    </td>
                    <td className="px-5 text-right font-mono tabular-nums text-sm">
                      {formatInr(
                        slabTab === "NEW"
                          ? taxResult.newRegimeTax
                          : taxResult.oldRegimeTax
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Personalized Gemini AI Tax Audit Report Section */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500 mb-0.5">
              Individual AI Model Inference · {profile.aiModel.modelCode}
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              Deep RBI Ledger &amp; Regime Audit for {profile.fullName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onRunAiAudit}
            disabled={aiAuditLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#0F766E] rounded-lg hover:bg-[#115E59] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {aiAuditLoading
                ? "Analyzing RBI AA Ledger..."
                : aiAudit
                ? "Re-Run Individual AI Audit"
                : "Run Individual AI Audit"}
            </span>
          </button>
        </div>

        {aiAuditLoading && (
          <div className="p-6 space-y-4">
            <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="h-24 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-24 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-24 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          </div>
        )}

        {!aiAuditLoading && aiAuditError && (
          <div className="p-6 flex items-start gap-3 text-xs text-[#DC2626] bg-red-50/40">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">AI Tax Audit Request Failed</p>
              <p className="mt-1 text-slate-700">{aiAuditError}</p>
            </div>
          </div>
        )}

        {!aiAuditLoading && !aiAuditError && !aiAudit && (
          <div className="px-6 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-sm text-slate-700 leading-relaxed">
                Generate a customized Chartered-Accountant-grade audit across{" "}
                <span className="font-medium text-slate-900">
                  {profile.ledger.length} RBI Account Aggregator entries
                </span>
                , calibrated specifically to {profile.fullName}&apos;s{" "}
                <span className="font-mono">{profile.aiModel.liquidityWeight}%</span>{" "}
                liquidity weight and{" "}
                <span className="font-mono">
                  {profile.aiModel.lockInToleranceYears}-year
                </span>{" "}
                lock-in ceiling.
              </p>
            </div>
            <button
              type="button"
              onClick={onRunAiAudit}
              className="px-4 py-2 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Generate Personalized Strategy
            </button>
          </div>
        )}

        {!aiAuditLoading && aiAudit && (
          <div className="divide-y divide-slate-200">
            <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-50/50">
              <div className="space-y-1.5 max-w-3xl">
                <div className="text-xs font-medium text-[#0F766E]">
                  Recommended Posture:{" "}
                  {aiAudit.recommendedRegime === "OLD_REGIME"
                    ? "Old Tax Regime (Deduction Shield)"
                    : "New Tax Regime (FY 2026-27 Slabs)"}
                </div>
                <p className="text-sm text-slate-800 leading-relaxed">
                  {aiAudit.personalizedSummary}
                </p>
              </div>
              <div className="shrink-0 lg:text-right">
                <div className="text-xs text-slate-500">
                  AI-Identified Additional Tax Alpha
                </div>
                <div className="text-2xl font-semibold font-mono tabular-nums text-[#16A34A]">
                  {formatInr(aiAudit.additionalPotentialSavingsInr)}
                </div>
              </div>
            </div>

            {aiAudit.strategies.length > 0 && (
              <div className="p-6">
                <h3 className="text-xs font-semibold text-slate-900 mb-4">
                  Bespoke Execution Steps
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {aiAudit.strategies.map((s, idx) => (
                    <div
                      key={`${s.title}-${idx}`}
                      className="space-y-1.5 pb-4 border-b border-slate-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                        <span>
                          {s.sectionCode} ·{" "}
                          {s.lockInYears === 0
                            ? "Liquid (0 yr lock)"
                            : `${s.lockInYears} yr lock-in`}
                        </span>
                        <span className="font-mono tabular-nums font-semibold text-[#16A34A]">
                          Save {formatInr(s.estimatedTaxSavedInr)}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900">
                        {s.title}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {s.mechanism}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aiAudit.complianceChecklist.length > 0 && (
              <div className="px-6 py-4 bg-slate-50/40">
                <div className="text-xs font-semibold text-slate-800 mb-2">
                  Audit Trail &amp; AIS/26AS Reconciliation Checklist
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
                  {aiAudit.complianceChecklist.map((note, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0F766E] shrink-0 mt-0.5" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
