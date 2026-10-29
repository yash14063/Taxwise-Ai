import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getAiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  // Endpoint 1: Run Personalized Individual AI Model Tax Audit over RBI AA Ledger
  app.post("/api/tax-ai/audit", async (req, res) => {
    try {
      const { profile, taxSummary } = req.body;
      if (!profile || !taxSummary) {
        res.status(400).json({ error: "Missing profile or taxSummary payload." });
        return;
      }

      const ai = getAiClient();

      const ledgerDigest = (profile.ledger || [])
        .slice(0, 35)
        .map(
          (row: Record<string, unknown>) =>
            `${row.date} | ${row.fipName} (${row.maskedAccount}) | ${row.flowType} | INR ${row.amount} | ${row.narration} | Mapped: ${row.mappedSection}`
        )
        .join("\n");

      const systemInstruction = `You are an expert Indian Chartered Accountant and Personalized Tax Optimization AI calibrated specifically for an individual's RBI Account Aggregator (Sahamati FIP-FIU) financial ledger under the Indian Income Tax Act (FY 2026-27 / AY 2027-28).
Strictly respect the individual's calibrated AI model parameters:
- Liquidity Preference Weight: ${profile.aiModel?.liquidityWeight ?? 50}/100 (high means avoid long 3-15 yr lock-ins like PPF/NPS Tier-I if short-lock ELSS or salary restructuring works)
- Max Lock-In Tolerance: ${profile.aiModel?.lockInToleranceYears ?? 3} years
- Audit Documentation Rigor: ${profile.aiModel?.auditRigorLevel ?? "STRICT"} (only recommend deductions backed by verifiable RBI ledger trails or statutory forms)
- LTCG/STCG Harvest Sensitivity Threshold: INR ${profile.aiModel?.harvestingThresholdInr ?? 15000}
- Employer NPS 80CCD(2) Salary Rebalancing Permitted: ${Boolean(profile.aiModel?.employerNpsRestructureAllowed)}
- Individual Context Notes: ${profile.aiModel?.customContextNotes || "None"}

Analyze their RBI Financial Ledger transactions and deterministic Old vs. New Regime tax computation. Identify concrete, legal, quantifiable Indian tax-saving actions (such as Section 80CCD(2) Employer NPS up to 14% of basic even in New Regime, LTCG INR 1,25,000 annual exemption harvesting from CAMS/Depository folios, STCG tax-loss harvesting, Section 44ADA 50% presumptive taxation for eligible professionals, unmapped medical/insurance/rent debits in bank statements, or Section 80C/80D/24b optimizations). Return concise, high-precision JSON.`;

      const prompt = `INDIVIDUAL PROFILE:
Name: ${profile.fullName}
Archetype: ${profile.archetype} (${profile.roleTitle})
Age: ${profile.age} | City Tier: ${profile.residentialCityType} | AY: ${profile.assessmentYear}

DETERMINISTIC TAX ENGINE SNAPSHOT (INR):
Gross Total Income: ${taxSummary.grossIncome}
Old Regime Total Tax (incl. cess): ${taxSummary.oldRegimeTax}
New Regime Total Tax (incl. cess): ${taxSummary.newRegimeTax}
Recommended Baseline Regime: ${taxSummary.optimalRegime}
Baseline Regime Savings: ${taxSummary.regimeDiffSavings}
80C Used: ${taxSummary.used80C} / 150000
80D Used: ${taxSummary.used80D} / 75000
80CCD(1B) Self NPS Used: ${taxSummary.used80CCD1B} / 50000
80CCD(2) Employer NPS Used: ${taxSummary.used80CCD2}
Realized LTCG: ${taxSummary.realizedLtcg} (Exempt up to 125000)

RBI ACCOUNT AGGREGATOR LEDGER ENTRIES:
${ledgerDigest}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              personalizedSummary: {
                type: Type.STRING,
                description:
                  "2-3 crisp sentences explaining the optimal tax posture for this exact individual and how their calibrated AI model weights shaped the strategy.",
              },
              recommendedRegime: {
                type: Type.STRING,
                description: "Either 'NEW_REGIME' or 'OLD_REGIME'.",
              },
              additionalPotentialSavingsInr: {
                type: Type.NUMBER,
                description:
                  "Estimated additional INR tax savings unlockable beyond current ledger state.",
              },
              strategies: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    sectionCode: { type: Type.STRING },
                    estimatedTaxSavedInr: { type: Type.NUMBER },
                    requiredActionAmountInr: { type: Type.NUMBER },
                    lockInYears: { type: Type.NUMBER },
                    mechanism: {
                      type: Type.STRING,
                      description:
                        "Concrete step referencing their RBI ledger or payroll/portfolio structure.",
                    },
                  },
                  required: [
                    "title",
                    "sectionCode",
                    "estimatedTaxSavedInr",
                    "requiredActionAmountInr",
                    "lockInYears",
                    "mechanism",
                  ],
                },
              },
              ledgerReclassifications: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    narrationMatch: { type: Type.STRING },
                    currentSection: { type: Type.STRING },
                    suggestedSection: { type: Type.STRING },
                    rationale: { type: Type.STRING },
                  },
                  required: [
                    "narrationMatch",
                    "currentSection",
                    "suggestedSection",
                    "rationale",
                  ],
                },
              },
              complianceChecklist: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: [
              "personalizedSummary",
              "recommendedRegime",
              "additionalPotentialSavingsInr",
              "strategies",
              "ledgerReclassifications",
              "complianceChecklist",
            ],
          },
        },
      });

      const rawText = response.text || "{}";
      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (error: unknown) {
      const errMessage =
        error instanceof Error ? error.message : "Failed to run AI tax audit.";
      console.error("AI Tax Audit Error:", errMessage);
      res.status(500).json({ error: errMessage });
    }
  });

  // Endpoint 2: Interactive Individual AI Tax Model Advisor Q&A
  app.post("/api/tax-ai/ask", async (req, res) => {
    try {
      const { profile, taxSummary, question, history } = req.body;
      if (!profile || !question) {
        res.status(400).json({ error: "Missing profile or question." });
        return;
      }

      const ai = getAiClient();

      const ledgerDigest = (profile.ledger || [])
        .slice(0, 30)
        .map(
          (row: Record<string, unknown>) =>
            `${row.date} | ${row.fipName} | ${row.flowType} INR ${row.amount} | ${row.narration} [${row.mappedSection}]`
        )
        .join("\n");

      const conversationHistory = Array.isArray(history)
        ? history
            .slice(-6)
            .map((m: { role: string; text: string }) => `${m.role.toUpperCase()}: ${m.text}`)
            .join("\n")
        : "";

      const systemInstruction = `You are the dedicated Individual Tax AI Model for ${profile.fullName} (${profile.roleTitle}, ${profile.archetype}), connected to their RBI Account Aggregator financial ledger for ${profile.assessmentYear}.
Model Calibration:
- Liquidity Priority: ${profile.aiModel?.liquidityWeight ?? 50}/100
- Max Lock-In Horizon: ${profile.aiModel?.lockInToleranceYears ?? 3} yrs
- Audit Rigor: ${profile.aiModel?.auditRigorLevel ?? "STRICT"}
- Employer NPS 80CCD(2) Allowed: ${Boolean(profile.aiModel?.employerNpsRestructureAllowed)}
- Notes: ${profile.aiModel?.customContextNotes || "None"}

Tax Computation Snapshot:
- Gross Income: INR ${taxSummary?.grossIncome ?? 0}
- Old Regime Tax: INR ${taxSummary?.oldRegimeTax ?? 0}
- New Regime Tax: INR ${taxSummary?.newRegimeTax ?? 0}
- Optimal Regime: ${taxSummary?.optimalRegime ?? "NEW_REGIME"}

Give direct, quantitative answers in plain prose with short bullet points where helpful. Cite specific RBI ledger entries and Indian Income Tax sections (FY 2026-27 rules) with exact rupee figures. Keep responses under 220 words.`;

      const contents = `${conversationHistory ? `PRIOR DIALOGUE:\n${conversationHistory}\n\n` : ""}RBI LEDGER SNAPSHOT:\n${ledgerDigest}\n\nUSER QUESTION: ${question}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents,
        config: {
          systemInstruction,
        },
      });

      res.json({
        answer: response.text || "Unable to generate a response at this moment.",
      });
    } catch (error: unknown) {
      const errMessage =
        error instanceof Error ? error.message : "Failed to query individual AI model.";
      console.error("AI Ask Error:", errMessage);
      res.status(500).json({ error: errMessage });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ArthaLedger server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
