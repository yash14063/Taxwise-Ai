import React, { useState } from "react";
import { Send, RotateCcw, Sparkles, AlertTriangle } from "lucide-react";
import {
  AuditRigorLevel,
  IndividualAiModelConfig,
  IndividualProfile,
  TaxComputationResult,
} from "../types/tax";
import { formatInr } from "../utils/taxEngine";

interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

interface IndividualAiStudioProps {
  profile: IndividualProfile;
  taxResult: TaxComputationResult;
  onUpdateModelConfig: (patch: Partial<IndividualAiModelConfig>) => void;
  onRunAiAudit: () => void;
}

export const IndividualAiStudio: React.FC<IndividualAiStudioProps> = ({
  profile,
  taxResult,
  onUpdateModelConfig,
  onRunAiAudit,
}) => {
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([]);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  const starterQuestions = [
    `Should I pick Old or New Regime given my ₹${(taxResult.grossIncome / 100000).toFixed(1)}L ledger inflows?`,
    "Which unmapped or under-utilized deductions exist in my RBI ledger right now?",
    "How can I harvest equity capital gains tax-free before March 31 without locking up cash?",
  ];

  const sendQuestion = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || asking) return;

    const updatedHistory: ChatTurn[] = [
      ...chatHistory,
      { role: "user", text: trimmed },
    ];
    setChatHistory(updatedHistory);
    setQuestion("");
    setAsking(true);
    setAskError(null);

    try {
      const res = await fetch("/api/tax-ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          taxSummary: {
            grossIncome: taxResult.grossIncome,
            oldRegimeTax: taxResult.oldRegimeTax,
            newRegimeTax: taxResult.newRegimeTax,
            optimalRegime: taxResult.optimalRegime,
          },
          question: trimmed,
          history: updatedHistory,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to reach individual AI model.");
      }
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", text: data.answer },
      ]);
    } catch (err: unknown) {
      setAskError(
        err instanceof Error ? err.message : "Failed to query AI model."
      );
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            Per-Individual Hyper-Personalization · Model ID{" "}
            <span className="font-mono">{profile.aiModel.modelCode}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
            Individual AI Tax Model Calibration
          </h1>
        </div>
        <button
          type="button"
          onClick={onRunAiAudit}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#0F766E] rounded-lg hover:bg-[#115E59] transition-colors whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Recalculate &amp; Run Full Audit</span>
        </button>
      </div>

      {/* Live Impact Strip */}
      <section className="bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-5">
          <div className="text-xs text-slate-500">Optimal Regime Output</div>
          <div className="mt-1.5 text-xl font-semibold text-slate-900">
            {taxResult.optimalRegime === "NEW_REGIME"
              ? "New Regime (FY 2026-27)"
              : "Old Regime (Full Shield)"}
          </div>
          <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
            Payable: {formatInr(taxResult.optimalTax)}
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs text-slate-500">
            Eligible Model Moves Matched
          </div>
          <div className="mt-1.5 text-xl font-semibold font-mono tabular-nums text-slate-900">
            {taxResult.modelMoves.length} Actions
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Filtered by {profile.aiModel.lockInToleranceYears}-yr max lock-in ceiling
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs text-slate-500">
            Model-Calibrated Unlockable Savings
          </div>
          <div className="mt-1.5 text-xl font-semibold font-mono tabular-nums text-[#16A34A]">
            {formatInr(taxResult.totalUnlockableAlpha)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Updates live as weights shift below
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 6 Columns: Hyper-Parameter Controls for This Individual */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
          <div className="px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              Personal Constraint Weights ({profile.fullName})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Every individual has distinct cashflow needs, salary structures, and lock-in horizons. Tuning these parameters reshapes both deterministic rules and Gemini strategy generation.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Liquidity Weight Slider */}
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <label
                  htmlFor="liquidity-slider"
                  className="font-semibold text-slate-800"
                >
                  Cashflow &amp; Liquidity Priority Weight
                </label>
                <span className="font-mono tabular-nums font-semibold text-[#0F766E]">
                  {profile.aiModel.liquidityWeight} / 100
                </span>
              </div>
              <input
                id="liquidity-slider"
                type="range"
                min={0}
                max={100}
                step={5}
                value={profile.aiModel.liquidityWeight}
                onChange={(e) =>
                  onUpdateModelConfig({
                    liquidityWeight: Number(e.target.value),
                  })
                }
                className="w-full accent-[#0F766E] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>0 · Maximize Tax Shield</span>
                <span>100 · Preserve Monthly Take-Home</span>
              </div>
            </div>

            {/* Max Lock-in Horizon */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-2">
                Maximum Instrument Lock-In Horizon
              </label>
              <div className="grid grid-cols-5 gap-1.5 p-1 bg-slate-100 rounded-lg">
                {[0, 1, 3, 5, 10].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() =>
                      onUpdateModelConfig({ lockInToleranceYears: yr })
                    }
                    className={`py-1.5 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap ${
                      profile.aiModel.lockInToleranceYears === yr
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {yr === 0 ? "0 yr" : `${yr} yrs`}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Setting 0 yr restricts recommendations to zero-lock moves (Sec 112A harvesting, HRA/80D ledger tagging). Setting ≥3 yrs unlocks ELSS &amp; retirement shields.
              </p>
            </div>

            {/* Capital Gains Harvest Sensitivity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Min Capital Gains Harvest Trigger (INR)
                </label>
                <input
                  type="number"
                  step={5000}
                  min={0}
                  value={profile.aiModel.harvestingThresholdInr}
                  onChange={(e) =>
                    onUpdateModelConfig({
                      harvestingThresholdInr: Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Basic Salary % of Gross CTC
                </label>
                <input
                  type="number"
                  min={0}
                  max={70}
                  value={profile.aiModel.basicSalaryRatioPercent}
                  onChange={(e) =>
                    onUpdateModelConfig({
                      basicSalaryRatioPercent: Math.min(
                        70,
                        Math.max(0, Number(e.target.value))
                      ),
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>
            </div>

            {/* Audit Rigor & Corporate NPS Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  AIS / 26AS Documentation Rigor
                </label>
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  {[AuditRigorLevel.STRICT, AuditRigorLevel.BALANCED].map(
                    (lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() =>
                          onUpdateModelConfig({ auditRigorLevel: lvl })
                        }
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          profile.aiModel.auditRigorLevel === lvl
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {lvl === AuditRigorLevel.STRICT
                          ? "Strict AA Proof"
                          : "Balanced"}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Employer Sec 80CCD(2) Restructure
                </label>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateModelConfig({
                      employerNpsRestructureAllowed:
                        !profile.aiModel.employerNpsRestructureAllowed,
                    })
                  }
                  className={`w-full py-2 px-3 text-xs font-medium rounded-lg border transition-colors ${
                    profile.aiModel.employerNpsRestructureAllowed
                      ? "bg-[#0F766E]/10 border-[#0F766E]/30 text-[#0F766E]"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  {profile.aiModel.employerNpsRestructureAllowed
                    ? "Permitted by Employer HR"
                    : "Not Available in Payroll"}
                </button>
              </div>
            </div>

            {/* Individual Context Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Individual Financial &amp; Family Context Prompt
              </label>
              <textarea
                rows={3}
                value={profile.aiModel.customContextNotes}
                onChange={(e) =>
                  onUpdateModelConfig({ customContextNotes: e.target.value })
                }
                placeholder="Describe upcoming home purchase, senior citizen parents medical expenses, foreign ESOPs, or freelance retainers..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E] leading-relaxed"
              />
            </div>
          </div>
        </section>

        {/* Right 6 Columns: Dedicated Individual AI Advisor Console */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Ask {profile.fullName.split(" ")[0]}&apos;s Calibrated Tax Model
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Grounded in your live RBI AA transactions and custom model weights
              </p>
            </div>
            {chatHistory.length > 0 && (
              <button
                type="button"
                onClick={() => setChatHistory([])}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          <div className="p-6 space-y-4 min-h-[340px] max-h-[460px] overflow-y-auto">
            {chatHistory.length === 0 ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Test what-if scenarios against your connected RBI Account Aggregator ledger. Select a question below or ask your own:
                </p>
                <div className="space-y-2">
                  {starterQuestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => sendQuestion(q)}
                      className="w-full text-left px-4 py-3 text-xs text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatHistory.map((turn, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-lg text-xs leading-relaxed whitespace-pre-wrap ${
                    turn.role === "user"
                      ? "bg-slate-900 text-white ml-8"
                      : "bg-slate-50 text-slate-800 border border-slate-200 mr-4"
                  }`}
                >
                  <div className="text-[10px] font-mono opacity-70 mb-1">
                    {turn.role === "user"
                      ? profile.fullName
                      : `Model ${profile.aiModel.modelCode}`}
                  </div>
                  {turn.text}
                </div>
              ))
            )}

            {asking && (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 mr-4 space-y-2">
                <div className="h-3 w-1/3 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-slate-200 rounded animate-pulse" />
              </div>
            )}

            {askError && (
              <div className="p-3 rounded-lg bg-red-50 text-xs text-[#DC2626] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{askError}</span>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendQuestion(question);
            }}
            className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center gap-2"
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about 80CCD(2), 44ADA, HRA, or LTCG harvesting..."
              className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
            />
            <button
              type="submit"
              disabled={asking || !question.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0F766E] rounded-lg hover:bg-[#115E59] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask Model</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
