export enum TaxpayerArchetype {
  SALARIED = "Salaried Individual",
  PROFESSIONAL_44ADA = "44ADA Consultant",
  INVESTOR_HUF = "Executive & Equity Investor",
}

export enum TaxSection {
  INCOME_SALARY = "Sec 17(1) · Salary",
  INCOME_44ADA = "Sec 44ADA · Professional",
  INCOME_LTCG = "Sec 112A · Equity LTCG",
  INCOME_STCG = "Sec 111A · Equity STCG",
  INCOME_INTEREST = "Sec 56 · Savings/FD Interest",
  DED_80C = "Sec 80C · ELSS/PF/PPF",
  DED_80CCD_1B = "Sec 80CCD(1B) · Self NPS",
  DED_80CCD_2 = "Sec 80CCD(2) · Employer NPS",
  DED_80D_SELF = "Sec 80D · Self Health Ins.",
  DED_80D_PARENTS = "Sec 80D · Senior Parents Ins.",
  DED_HRA = "Sec 10(13A) · House Rent",
  DED_24B = "Sec 24(b) · Home Loan Int.",
  DED_80G = "Sec 80G · Charitable Donation",
  HARVESTABLE_EQUITY = "Portfolio · Unrealized Gain",
  TAX_LOSS_CANDIDATE = "Portfolio · Unrealized Loss",
  UNMAPPED = "Unmapped · Personal Expense",
}

export enum AuditRigorLevel {
  STRICT = "STRICT",
  BALANCED = "BALANCED",
}

export interface FipAccountConsent {
  id: string;
  fipName: string;
  fiType: "DEPOSIT" | "MUTUAL_FUNDS" | "EQUITIES" | "NPS_EPF" | "INSURANCE";
  maskedAccount: string;
  aaHandle: string;
  consentExpiry: string;
  active: boolean;
  lastSynced: string;
}

export interface RbiLedgerEntry {
  id: string;
  date: string;
  fipName: string;
  maskedAccount: string;
  narration: string;
  flowType: "CREDIT" | "DEBIT" | "HOLDING";
  amount: number;
  mappedSection: TaxSection;
  verifiedByAa: boolean;
}

export interface IndividualAiModelConfig {
  modelCode: string;
  liquidityWeight: number; // 0 to 100
  lockInToleranceYears: number; // 0, 1, 3, 5, 10, 15
  auditRigorLevel: AuditRigorLevel;
  harvestingThresholdInr: number;
  employerNpsRestructureAllowed: boolean;
  basicSalaryRatioPercent: number; // e.g., 45% of gross salary
  customContextNotes: string;
}

export interface IndividualProfile {
  id: string;
  fullName: string;
  panMasked: string;
  assessmentYear: string;
  age: number;
  residentialCityType: "METRO" | "NON_METRO";
  archetype: TaxpayerArchetype;
  roleTitle: string;
  avatarUrl: string;
  aiModel: IndividualAiModelConfig;
  consents: FipAccountConsent[];
  ledger: RbiLedgerEntry[];
}

export interface SlabRow {
  slabLabel: string;
  ratePercent: number;
  taxableSlice: number;
  taxAmount: number;
}

export interface DeterministicOptimizationMove {
  id: string;
  title: string;
  section: TaxSection;
  regimeApplicability: "BOTH" | "NEW_REGIME" | "OLD_REGIME";
  actionAmount: number;
  estimatedTaxSaved: number;
  lockInYears: number;
  rationale: string;
  simulationEntry: Omit<RbiLedgerEntry, "id">;
  reclassifyEntryId?: string;
}

export interface TaxComputationResult {
  grossSalary: number;
  grossProfessionalReceipts: number;
  taxable44AdaIncome: number;
  savingsInterest: number;
  realizedLtcg: number;
  realizedStcg: number;
  unrealizedHarvestableGain: number;
  unrealizedHarvestableLoss: number;
  grossIncome: number;

  // Deductions utilized
  used80C: number;
  used80CCD1B: number;
  used80CCD2Old: number;
  used80CCD2New: number;
  used80D: number;
  usedHraExemption: number;
  used24b: number;
  used80G: number;

  // Old Regime
  oldTaxableNormalIncome: number;
  oldNormalSlabTax: number;
  oldSlabs: SlabRow[];
  oldCapitalGainsTax: number;
  oldRegimeTax: number;
  oldEffectiveRate: number;

  // New Regime (FY 2026-27)
  newTaxableNormalIncome: number;
  newNormalSlabTax: number;
  newSlabs: SlabRow[];
  newCapitalGainsTax: number;
  newRegimeTax: number;
  newEffectiveRate: number;

  optimalRegime: "NEW_REGIME" | "OLD_REGIME";
  optimalTax: number;
  regimeDiffSavings: number;

  modelMoves: DeterministicOptimizationMove[];
  totalUnlockableAlpha: number;
}

export interface AiAuditStrategy {
  title: string;
  sectionCode: string;
  estimatedTaxSavedInr: number;
  requiredActionAmountInr: number;
  lockInYears: number;
  mechanism: string;
}

export interface AiLedgerReclassification {
  narrationMatch: string;
  currentSection: string;
  suggestedSection: string;
  rationale: string;
}

export interface AiAuditResponse {
  personalizedSummary: string;
  recommendedRegime: "NEW_REGIME" | "OLD_REGIME" | string;
  additionalPotentialSavingsInr: number;
  strategies: AiAuditStrategy[];
  ledgerReclassifications: AiLedgerReclassification[];
  complianceChecklist: string[];
}
