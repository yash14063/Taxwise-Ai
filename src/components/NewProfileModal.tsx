import React, { useState } from "react";
import { X } from "lucide-react";
import {
  AuditRigorLevel,
  IndividualProfile,
  RbiLedgerEntry,
  TaxpayerArchetype,
  TaxSection,
} from "../types/tax";

interface NewProfileModalProps {
  onClose: () => void;
  onCreateProfile: (profile: IndividualProfile) => void;
}

export const NewProfileModal: React.FC<NewProfileModalProps> = ({
  onClose,
  onCreateProfile,
}) => {
  const [fullName, setFullName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [age, setAge] = useState("30");
  const [cityType, setCityType] = useState<"METRO" | "NON_METRO">("METRO");
  const [archetype, setArchetype] = useState<TaxpayerArchetype>(
    TaxpayerArchetype.SALARIED
  );
  const [annualPrimaryInflow, setAnnualPrimaryInflow] = useState("2400000");
  const [annual80C, setAnnual80C] = useState("75000");
  const [annualRent, setAnnualRent] = useState("360000");
  const [fipBank, setFipBank] = useState("HDFC Bank FIP");
  const [liquidityWeight, setLiquidityWeight] = useState("65");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    const id = `ind-${Date.now()}`;
    const codeSuffix = Math.floor(1000 + Math.random() * 9000);
    const primaryAmt = Math.max(0, Number(annualPrimaryInflow) || 0);
    const ded80cAmt = Math.max(0, Number(annual80C) || 0);
    const rentAmt = Math.max(0, Number(annualRent) || 0);

    const ledger: RbiLedgerEntry[] = [
      {
        id: `${id}-1`,
        date: "2026-10-01",
        fipName: fipBank,
        maskedAccount: "XXXX-9012",
        narration:
          archetype === TaxpayerArchetype.PROFESSIONAL_44ADA
            ? "NEFT PROFESSIONAL CONSULTING RECEIPTS FY26-27"
            : "ANNUALIZED PAYROLL CREDIT STREAM",
        flowType: "CREDIT",
        amount: primaryAmt,
        mappedSection:
          archetype === TaxpayerArchetype.PROFESSIONAL_44ADA
            ? TaxSection.INCOME_44ADA
            : TaxSection.INCOME_SALARY,
        verifiedByAa: true,
      },
    ];

    if (ded80cAmt > 0) {
      ledger.push({
        id: `${id}-2`,
        date: "2026-09-15",
        fipName: fipBank,
        maskedAccount: "XXXX-9012",
        narration: "EPF / ELSS TAX SAVER INVESTMENT",
        flowType: "DEBIT" as const,
        amount: ded80cAmt,
        mappedSection: TaxSection.DED_80C,
        verifiedByAa: true,
      });
    }

    if (rentAmt > 0) {
      ledger.push({
        id: `${id}-3`,
        date: "2026-09-05",
        fipName: fipBank,
        maskedAccount: "XXXX-9012",
        narration: "UPI/NEFT RESIDENTIAL HOUSE RENT ANNUAL",
        flowType: "DEBIT" as const,
        amount: rentAmt,
        mappedSection: TaxSection.DED_HRA,
        verifiedByAa: true,
      });
    }

    const newProfile: IndividualProfile = {
      id,
      fullName: fullName.trim(),
      panMasked: "NEWPK••••1Z",
      assessmentYear: "AY 2027-28 (FY 2026-27)",
      age: Number(age) || 30,
      residentialCityType: cityType,
      archetype,
      roleTitle:
        roleTitle.trim() || `${archetype} · ${cityType === "METRO" ? "Metro" : "Non-Metro"}`,
      avatarUrl: "",
      aiModel: {
        modelCode: `IND-AA-USR-${codeSuffix}`,
        liquidityWeight: Number(liquidityWeight) || 60,
        lockInToleranceYears: 3,
        auditRigorLevel: AuditRigorLevel.STRICT,
        harvestingThresholdInr: 15000,
        employerNpsRestructureAllowed:
          archetype !== TaxpayerArchetype.PROFESSIONAL_44ADA,
        basicSalaryRatioPercent:
          archetype === TaxpayerArchetype.PROFESSIONAL_44ADA ? 0 : 45,
        customContextNotes:
          "Newly provisioned individual RBI Account Aggregator ledger profile.",
      },
      consents: [
        {
          id: `consent-${id}`,
          fipName: fipBank,
          fiType: "DEPOSIT",
          maskedAccount: "XXXX-9012",
          aaHandle: `${fullName.trim().toLowerCase().split(" ")[0]}@finvu`,
          consentExpiry: "2027-03-31",
          active: true,
          lastSynced: "Just now",
        },
      ],
      ledger,
    };

    onCreateProfile(newProfile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Provision Individual RBI AA Profile &amp; AI Model
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rohan Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Profession / Role
              </label>
              <input
                type="text"
                placeholder="e.g. Principal Designer · Pune"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Taxpayer Archetype
              </label>
              <select
                value={archetype}
                onChange={(e) =>
                  setArchetype(e.target.value as TaxpayerArchetype)
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              >
                {Object.values(TaxpayerArchetype).map((arch) => (
                  <option key={arch} value={arch}>
                    {arch}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Age
              </label>
              <input
                type="number"
                min={18}
                max={99}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                City HRA Tier
              </label>
              <select
                value={cityType}
                onChange={(e) =>
                  setCityType(e.target.value as "METRO" | "NON_METRO")
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              >
                <option value="METRO">Metro (50% HRA)</option>
                <option value="NON_METRO">Non-Metro (40% HRA)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Annual Gross Inflow (₹)
              </label>
              <input
                type="number"
                value={annualPrimaryInflow}
                onChange={(e) => setAnnualPrimaryInflow(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Existing 80C Outflow (₹)
              </label>
              <input
                type="number"
                value={annual80C}
                onChange={(e) => setAnnual80C(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Annual Rent Paid (₹)
              </label>
              <input
                type="number"
                value={annualRent}
                onChange={(e) => setAnnualRent(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Primary RBI FIP Bank
              </label>
              <select
                value={fipBank}
                onChange={(e) => setFipBank(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              >
                <option value="HDFC Bank FIP">HDFC Bank FIP</option>
                <option value="ICICI Bank FIP">ICICI Bank FIP</option>
                <option value="State Bank of India FIP">State Bank of India FIP</option>
                <option value="Axis Bank FIP">Axis Bank FIP</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Initial AI Liquidity Weight ({liquidityWeight}/100)
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={liquidityWeight}
                onChange={(e) => setLiquidityWeight(e.target.value)}
                className="w-full mt-2 accent-[#0F766E]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-[#0F766E] rounded-lg hover:bg-[#115E59] transition-colors"
            >
              Initialize Ledger &amp; Model
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
