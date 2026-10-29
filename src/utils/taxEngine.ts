import {
  DeterministicOptimizationMove,
  IndividualProfile,
  SlabRow,
  TaxComputationResult,
  TaxSection,
} from "../types/tax";

const CESS_RATE = 0.04;

function computeOldRegimeSlabs(taxableIncome: number, age: number): { tax: number; slabs: SlabRow[] } {
  const basicExemption = age >= 60 ? 300000 : 250000;
  const brackets = [
    { min: 0, max: basicExemption, rate: 0, label: `Up to ₹${(basicExemption / 100000).toFixed(1)}L` },
    { min: basicExemption, max: 500000, rate: 0.05, label: `₹${(basicExemption / 100000).toFixed(1)}L – ₹5.0L` },
    { min: 500000, max: 1000000, rate: 0.2, label: "₹5.0L – ₹10.0L" },
    { min: 1000000, max: Infinity, rate: 0.3, label: "Above ₹10.0L" },
  ];

  let totalTax = 0;
  const slabs: SlabRow[] = brackets.map((b) => {
    const slice = Math.max(0, Math.min(taxableIncome, b.max) - b.min);
    const amt = Math.round(slice * b.rate);
    totalTax += amt;
    return {
      slabLabel: b.label,
      ratePercent: Math.round(b.rate * 100),
      taxableSlice: slice,
      taxAmount: amt,
    };
  });

  // Sec 87A rebate under Old Regime up to ₹5,00,000
  if (taxableIncome <= 500000) {
    totalTax = Math.max(0, totalTax - 12500);
  }

  return { tax: totalTax, slabs };
}

function computeNewRegimeSlabs(taxableIncome: number): { tax: number; slabs: SlabRow[] } {
  // FY 2026-27 (AY 2027-28) New Tax Regime Slabs
  const brackets = [
    { min: 0, max: 400000, rate: 0, label: "Up to ₹4.0L" },
    { min: 400000, max: 800000, rate: 0.05, label: "₹4.0L – ₹8.0L" },
    { min: 800000, max: 1200000, rate: 0.1, label: "₹8.0L – ₹12.0L" },
    { min: 1200000, max: 1600000, rate: 0.15, label: "₹12.0L – ₹16.0L" },
    { min: 1600000, max: 2000000, rate: 0.2, label: "₹16.0L – ₹20.0L" },
    { min: 2000000, max: 2400000, rate: 0.25, label: "₹20.0L – ₹24.0L" },
    { min: 2400000, max: Infinity, rate: 0.3, label: "Above ₹24.0L" },
  ];

  let totalTax = 0;
  const slabs: SlabRow[] = brackets.map((b) => {
    const slice = Math.max(0, Math.min(taxableIncome, b.max) - b.min);
    const amt = Math.round(slice * b.rate);
    totalTax += amt;
    return {
      slabLabel: b.label,
      ratePercent: Math.round(b.rate * 100),
      taxableSlice: slice,
      taxAmount: amt,
    };
  });

  // Sec 87A Rebate in New Regime up to ₹12,00,000 normal taxable income (max ₹60,000 rebate + marginal relief)
  if (taxableIncome <= 1200000) {
    totalTax = 0;
  } else if (taxableIncome > 1200000 && taxableIncome <= 1275000) {
    const excessOver12L = taxableIncome - 1200000;
    if (totalTax > excessOver12L) {
      totalTax = excessOver12L;
    }
  }

  return { tax: totalTax, slabs };
}

export function evaluateProfileTax(profile: IndividualProfile): TaxComputationResult {
  const activeFipNames = new Set(
    profile.consents.filter((c) => c.active).map((c) => c.fipName)
  );

  // Include active FIP rows plus user-added simulation/manual rows
  const activeLedger = profile.ledger.filter(
    (entry) =>
      activeFipNames.has(entry.fipName) ||
      entry.fipName.includes("Simulation") ||
      entry.fipName.includes("Manual")
  );

  let grossSalary = 0;
  let grossProfessionalReceipts = 0;
  let savingsInterest = 0;
  let realizedLtcg = 0;
  let realizedStcg = 0;
  let unrealizedHarvestableGain = 0;
  let unrealizedHarvestableLoss = 0;

  let raw80C = 0;
  let raw80CCD1B = 0;
  let raw80CCD2 = 0;
  let raw80DSelf = 0;
  let raw80DParents = 0;
  let rawRentPaid = 0;
  let raw24b = 0;
  let raw80G = 0;

  for (const row of activeLedger) {
    switch (row.mappedSection) {
      case TaxSection.INCOME_SALARY:
        grossSalary += row.amount;
        break;
      case TaxSection.INCOME_44ADA:
        grossProfessionalReceipts += row.amount;
        break;
      case TaxSection.INCOME_INTEREST:
        savingsInterest += row.amount;
        break;
      case TaxSection.INCOME_LTCG:
        realizedLtcg += row.amount;
        break;
      case TaxSection.INCOME_STCG:
        realizedStcg += row.amount;
        break;
      case TaxSection.HARVESTABLE_EQUITY:
        unrealizedHarvestableGain += row.amount;
        break;
      case TaxSection.TAX_LOSS_CANDIDATE:
        unrealizedHarvestableLoss += row.amount;
        break;
      case TaxSection.DED_80C:
        raw80C += row.amount;
        break;
      case TaxSection.DED_80CCD_1B:
        raw80CCD1B += row.amount;
        break;
      case TaxSection.DED_80CCD_2:
        raw80CCD2 += row.amount;
        break;
      case TaxSection.DED_80D_SELF:
        raw80DSelf += row.amount;
        break;
      case TaxSection.DED_80D_PARENTS:
        raw80DParents += row.amount;
        break;
      case TaxSection.DED_HRA:
        rawRentPaid += row.amount;
        break;
      case TaxSection.DED_24B:
        raw24b += row.amount;
        break;
      case TaxSection.DED_80G:
        raw80G += row.amount;
        break;
      default:
        break;
    }
  }

  // Presumptive 44ADA: 50% of gross receipts up to ₹75L (when digital receipts >= 95%)
  const taxable44AdaIncome =
    grossProfessionalReceipts <= 7500000
      ? Math.round(grossProfessionalReceipts * 0.5)
      : grossProfessionalReceipts;

  const basicSalary = Math.round(
    grossSalary * ((profile.aiModel.basicSalaryRatioPercent || 45) / 100)
  );

  // HRA Exemption (Old Regime only): min(Actual HRA ~50%/40% basic, Rent paid - 10% basic)
  let usedHraExemption = 0;
  if (grossSalary > 0 && rawRentPaid > 0) {
    const cityCap =
      profile.residentialCityType === "METRO"
        ? Math.round(basicSalary * 0.5)
        : Math.round(basicSalary * 0.4);
    const rentMinus10Basic = Math.max(0, rawRentPaid - Math.round(basicSalary * 0.1));
    usedHraExemption = Math.min(cityCap, rentMinus10Basic);
  }

  const used80C = Math.min(150000, raw80C);
  const used80CCD1B = Math.min(50000, raw80CCD1B);
  const max80CCD2Old = Math.round(basicSalary * 0.1);
  const max80CCD2New = Math.round(basicSalary * 0.14);
  const used80CCD2Old = grossSalary > 0 ? Math.min(max80CCD2Old, raw80CCD2) : 0;
  const used80CCD2New = grossSalary > 0 ? Math.min(max80CCD2New, raw80CCD2) : 0;

  const capped80DSelf = Math.min(profile.age >= 60 ? 50000 : 25000, raw80DSelf);
  const capped80DParents = Math.min(50000, raw80DParents);
  const used80D = Math.min(75000, capped80DSelf + capped80DParents);
  const used24b = Math.min(200000, raw24b);
  const used80G = Math.round(raw80G * 0.5);
  const used80TTA = Math.min(profile.age >= 60 ? 50000 : 10000, savingsInterest);

  const oldStdDeduction = grossSalary > 0 ? 50000 : 0;
  const newStdDeduction = grossSalary > 0 ? 75000 : 0;

  const normalIncomeBeforeDed =
    grossSalary + taxable44AdaIncome + savingsInterest;

  const totalOldDeductions =
    oldStdDeduction +
    usedHraExemption +
    used80C +
    used80CCD1B +
    used80CCD2Old +
    used80D +
    used24b +
    used80G +
    used80TTA;

  const totalNewDeductions = newStdDeduction + used80CCD2New;

  const oldTaxableNormalIncome = Math.max(0, normalIncomeBeforeDed - totalOldDeductions);
  const newTaxableNormalIncome = Math.max(0, normalIncomeBeforeDed - totalNewDeductions);

  const oldSlabEval = computeOldRegimeSlabs(oldTaxableNormalIncome, profile.age);
  const newSlabEval = computeNewRegimeSlabs(newTaxableNormalIncome);

  // Capital Gains (Sec 112A LTCG @ 12.5% above ₹1.25L exemption; Sec 111A STCG @ 20%)
  const netRealizedLtcg = Math.max(0, realizedLtcg);
  const netRealizedStcg = Math.max(0, realizedStcg);
  const taxableLtcg = Math.max(0, netRealizedLtcg - 125000);
  const ltcgTax = Math.round(taxableLtcg * 0.125);
  const stcgTax = Math.round(netRealizedStcg * 0.2);
  const capitalGainsTax = ltcgTax + stcgTax;

  const oldRegimeTax = Math.round(
    (oldSlabEval.tax + capitalGainsTax) * (1 + CESS_RATE)
  );
  const newRegimeTax = Math.round(
    (newSlabEval.tax + capitalGainsTax) * (1 + CESS_RATE)
  );

  const grossIncome =
    grossSalary +
    grossProfessionalReceipts +
    savingsInterest +
    Math.max(0, realizedLtcg) +
    Math.max(0, realizedStcg);

  const oldEffectiveRate =
    grossIncome > 0 ? Number(((oldRegimeTax / grossIncome) * 100).toFixed(2)) : 0;
  const newEffectiveRate =
    grossIncome > 0 ? Number(((newRegimeTax / grossIncome) * 100).toFixed(2)) : 0;

  const optimalRegime =
    newRegimeTax <= oldRegimeTax ? "NEW_REGIME" : "OLD_REGIME";
  const optimalTax = Math.min(newRegimeTax, oldRegimeTax);
  const regimeDiffSavings = Math.abs(oldRegimeTax - newRegimeTax);

  // Generate Model-Calibrated Deterministic Tax-Saving Moves from RBI Ledger
  const modelMoves: DeterministicOptimizationMove[] = [];

  // 1. Detect unmapped RBI bank debits that match Insurance / NPS / Rent patterns
  for (const row of activeLedger) {
    if (row.mappedSection === TaxSection.UNMAPPED && row.flowType === "DEBIT") {
      const upper = row.narration.toUpperCase();
      if (
        upper.includes("HEALTH") ||
        upper.includes("ERGO") ||
        upper.includes("BUPA") ||
        upper.includes("STAR") ||
        upper.includes("PARENTS")
      ) {
        const marginalOld = oldTaxableNormalIncome > 1000000 ? 0.312 : 0.208;
        const estSave = Math.round(Math.min(50000, row.amount) * marginalOld);
        modelMoves.push({
          id: `reclass-${row.id}`,
          title: "Tag RBI Bank Debit under Sec 80D Senior Parents Health Policy",
          section: TaxSection.DED_80D_PARENTS,
          regimeApplicability: "OLD_REGIME",
          actionAmount: row.amount,
          estimatedTaxSaved: estSave,
          lockInYears: 0,
          rationale: `Detected unmapped health insurance debit "${row.narration}" on ${row.fipName}. Reclassifying unlocks Sec 80D parental cover with zero new cash outflow.`,
          reclassifyEntryId: row.id,
          simulationEntry: {
            date: row.date,
            fipName: row.fipName,
            maskedAccount: row.maskedAccount,
            narration: row.narration,
            flowType: "DEBIT",
            amount: row.amount,
            mappedSection: TaxSection.DED_80D_PARENTS,
            verifiedByAa: true,
          },
        });
      } else if (upper.includes("NPS") || upper.includes("PROTEAN")) {
        const marginalOld = oldTaxableNormalIncome > 1000000 ? 0.312 : 0.208;
        const estSave = Math.round(Math.min(50000, row.amount) * marginalOld);
        modelMoves.push({
          id: `reclass-${row.id}`,
          title: "Map Unclassified Protean NPS Debit to Sec 80CCD(1B)",
          section: TaxSection.DED_80CCD_1B,
          regimeApplicability: "OLD_REGIME",
          actionAmount: row.amount,
          estimatedTaxSaved: estSave,
          lockInYears: 0,
          rationale: `Detected unmapped ₹${row.amount.toLocaleString("en-IN")} NPS contribution in ${row.fipName}. Mapping it claims additional Sec 80CCD(1B) deduction above 80C.`,
          reclassifyEntryId: row.id,
          simulationEntry: {
            date: row.date,
            fipName: row.fipName,
            maskedAccount: row.maskedAccount,
            narration: row.narration,
            flowType: "DEBIT",
            amount: row.amount,
            mappedSection: TaxSection.DED_80CCD_1B,
            verifiedByAa: true,
          },
        });
      }
    }
  }

  // 2. Employer NPS 80CCD(2) Salary Rebalancing (Works in BOTH New & Old Regime!)
  if (
    grossSalary > 0 &&
    profile.aiModel.employerNpsRestructureAllowed &&
    used80CCD2New < max80CCD2New
  ) {
    const headroom = max80CCD2New - used80CCD2New;
    // Respect individual's liquidity weight: if liquidityWeight > 70, suggest 50% of headroom instead of full 14%
    const calibratedAllocation =
      profile.aiModel.liquidityWeight > 70
        ? Math.round(headroom * 0.55)
        : headroom;
    if (calibratedAllocation >= 15000) {
      const marginalNew =
        newTaxableNormalIncome > 2400000
          ? 0.312
          : newTaxableNormalIncome > 2000000
          ? 0.26
          : newTaxableNormalIncome > 1600000
          ? 0.208
          : 0.156;
      const estSaved = Math.round(calibratedAllocation * marginalNew);
      modelMoves.push({
        id: "move-80ccd2",
        title: "Activate Sec 80CCD(2) Corporate NPS Payroll Restructure (14% Basic Cap)",
        section: TaxSection.DED_80CCD_2,
        regimeApplicability: "BOTH",
        actionAmount: calibratedAllocation,
        estimatedTaxSaved: estSaved,
        lockInYears: Math.max(3, profile.aiModel.lockInToleranceYears),
        rationale: `Allowed even under the FY 2026-27 New Tax Regime up to 14% of Basic. Calibrated to your ${profile.aiModel.liquidityWeight}% liquidity weight so take-home cashflow stays comfortable.`,
        simulationEntry: {
          date: "2026-11-01",
          fipName: "Simulation · Payroll AA",
          maskedAccount: "CORP-NPS",
          narration: "SIMULATED SEC 80CCD(2) EMPLOYER NPS RESTRUCTURE",
          flowType: "DEBIT",
          amount: calibratedAllocation,
          mappedSection: TaxSection.DED_80CCD_2,
          verifiedByAa: false,
        },
      });
    }
  }

  // 3. LTCG Annual ₹1.25L Tax-Free Exemption Harvesting from CAMS / Depository Holdings
  const unusedLtcgExemption = Math.max(0, 125000 - Math.max(0, realizedLtcg));
  if (
    unusedLtcgExemption >= profile.aiModel.harvestingThresholdInr &&
    unrealizedHarvestableGain >= profile.aiModel.harvestingThresholdInr
  ) {
    const harvestAmount = Math.min(unusedLtcgExemption, unrealizedHarvestableGain);
    const futureLtcgSaved = Math.round(harvestAmount * 0.125 * (1 + CESS_RATE));
    modelMoves.push({
      id: "move-ltcg-harvest",
      title: "Harvest Annual ₹1.25L Tax-Free Equity LTCG Step-Up (Sec 112A)",
      section: TaxSection.INCOME_LTCG,
      regimeApplicability: "BOTH",
      actionAmount: harvestAmount,
      estimatedTaxSaved: futureLtcgSaved,
      lockInYears: 0,
      rationale: `Your Depository/RTA FIP shows ₹${unrealizedHarvestableGain.toLocaleString("en-IN")} unrealized >12M equity gain while ₹${unusedLtcgExemption.toLocaleString("en-IN")} of your Sec 112A exemption sits unused. Sell & re-buy same day (0-year lock-in) to reset cost basis tax-free.`,
      simulationEntry: {
        date: "2026-11-02",
        fipName: "Simulation · RTA Harvest",
        maskedAccount: "STEP-UP",
        narration: "TAX-FREE SEC 112A COST-BASIS RESET HARVEST",
        flowType: "CREDIT",
        amount: harvestAmount,
        mappedSection: TaxSection.INCOME_LTCG,
        verifiedByAa: false,
      },
    });
  }

  // 4. Tax-Loss Harvesting against Realized STCG (20.8% rate) or Realized LTCG (>1.25L @ 13%)
  if (unrealizedHarvestableLoss >= profile.aiModel.harvestingThresholdInr) {
    if (realizedStcg > 0) {
      const offsetAmt = Math.min(realizedStcg, unrealizedHarvestableLoss);
      const saved = Math.round(offsetAmt * 0.2 * (1 + CESS_RATE));
      modelMoves.push({
        id: "move-stcg-loss-offset",
        title: "Book Short-Term Dip to Offset 20% Sec 111A STCG Liability",
        section: TaxSection.INCOME_STCG,
        regimeApplicability: "BOTH",
        actionAmount: offsetAmt,
        estimatedTaxSaved: saved,
        lockInYears: 0,
        rationale: `Offset ₹${offsetAmt.toLocaleString("en-IN")} of realized STCG taxed at 20.8% (incl. cess) by booking the unrealized dip detected in your RTA/Depository FIP.`,
        simulationEntry: {
          date: "2026-11-03",
          fipName: "Simulation · Loss Offset",
          maskedAccount: "OFFSET-111A",
          narration: "BOOKED SHORT-TERM CAPITAL LOSS SET-OFF",
          flowType: "CREDIT",
          amount: -offsetAmt,
          mappedSection: TaxSection.INCOME_STCG,
          verifiedByAa: false,
        },
      });
    } else if (realizedLtcg > 125000) {
      const taxableExcess = realizedLtcg - 125000;
      const offsetAmt = Math.min(taxableExcess, unrealizedHarvestableLoss);
      const saved = Math.round(offsetAmt * 0.125 * (1 + CESS_RATE));
      modelMoves.push({
        id: "move-ltcg-loss-offset",
        title: "Offset Taxable Sec 112A LTCG Excess Using Portfolio Loss Position",
        section: TaxSection.INCOME_LTCG,
        regimeApplicability: "BOTH",
        actionAmount: offsetAmt,
        estimatedTaxSaved: saved,
        lockInYears: 0,
        rationale: `Your realized LTCG exceeds ₹1.25L by ₹${taxableExcess.toLocaleString("en-IN")}. Booking ₹${offsetAmt.toLocaleString("en-IN")} from your underwater Depository basket trims 13% LTCG tax immediately.`,
        simulationEntry: {
          date: "2026-11-03",
          fipName: "Simulation · Loss Offset",
          maskedAccount: "OFFSET-112A",
          narration: "BOOKED CAPITAL LOSS SET-OFF AGAINST SEC 112A",
          flowType: "CREDIT",
          amount: -offsetAmt,
          mappedSection: TaxSection.INCOME_LTCG,
          verifiedByAa: false,
        },
      });
    }
  }

  // 5. Remaining 80C ELSS Headroom (Only if Old Regime is competitive & lock-in tolerance >= 3 yrs)
  if (
    used80C < 150000 &&
    profile.aiModel.lockInToleranceYears >= 3 &&
    oldRegimeTax - newRegimeTax < 35000
  ) {
    const gap80C = 150000 - used80C;
    const marginalOld = oldTaxableNormalIncome > 1000000 ? 0.312 : 0.208;
    const saved = Math.round(gap80C * marginalOld);
    modelMoves.push({
      id: "move-80c-elss",
      title: "Fill Remaining Sec 80C Cap via 3-Year Lock-In ELSS Index Fund",
      section: TaxSection.DED_80C,
      regimeApplicability: "OLD_REGIME",
      actionAmount: gap80C,
      estimatedTaxSaved: saved,
      lockInYears: 3,
      rationale: `Matches your ${profile.aiModel.lockInToleranceYears}-year lock-in tolerance (shortest statutory 80C lock-in vs 15-yr PPF) to maximize Old Regime shield.`,
      simulationEntry: {
        date: "2026-11-05",
        fipName: "Simulation · CAMS ELSS",
        maskedAccount: "ELSS-80C",
        narration: "SIMULATED SEC 80C ELSS TAX SAVER TOP-UP",
        flowType: "DEBIT",
        amount: gap80C,
        mappedSection: TaxSection.DED_80C,
        verifiedByAa: false,
      },
    });
  }

  const totalUnlockableAlpha = modelMoves.reduce(
    (sum, m) => sum + m.estimatedTaxSaved,
    0
  );

  return {
    grossSalary,
    grossProfessionalReceipts,
    taxable44AdaIncome,
    savingsInterest,
    realizedLtcg,
    realizedStcg,
    unrealizedHarvestableGain,
    unrealizedHarvestableLoss,
    grossIncome,
    used80C,
    used80CCD1B,
    used80CCD2Old,
    used80CCD2New,
    used80D,
    usedHraExemption,
    used24b,
    used80G,
    oldTaxableNormalIncome,
    oldNormalSlabTax: oldSlabEval.tax,
    oldSlabs: oldSlabEval.slabs,
    oldCapitalGainsTax: capitalGainsTax,
    oldRegimeTax,
    oldEffectiveRate,
    newTaxableNormalIncome,
    newNormalSlabTax: newSlabEval.tax,
    newSlabs: newSlabEval.slabs,
    newCapitalGainsTax: capitalGainsTax,
    newRegimeTax,
    newEffectiveRate,
    optimalRegime,
    optimalTax,
    regimeDiffSavings,
    modelMoves,
    totalUnlockableAlpha,
  };
}

export function formatInr(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}₹${Math.abs(Math.round(amount)).toLocaleString("en-IN")}`;
}
