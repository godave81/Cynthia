# Cynthia

> HIPAA-compliant synthetic U.S. medical claims data — on demand.

Cynthia is an internal web app for healthcare analytics teams. Upload a source sample, write a natural language prompt, and download a fully synthetic Provider + Member + Claims CSV — statistically faithful, zero PHI, referential integrity guaranteed.

---

## What It Does

Data scientists at healthcare AI companies spend weeks hand-crafting synthetic training data before a single model trains. Real patient data is locked behind BAAs, de-identification audits, and legal review cycles. Cynthia solves this:

1. **Write a prompt** — `"5,000 orthopedic claims in Texas and Florida, 2025–2026"`
2. **Upload a sample CSV** (optional, ≤5,000 rows) and a schema file
3. **Review the parsed schema** — field types auto-detected, generation rules extracted
4. **Generate** — Claude synthesises the full dataset from your prompt + statistical profile
5. **Download** — one consolidated flat CSV, Compliance Report included

Every output is scanned for PHI before delivery. Privacy Score and Synthetic Data Similarity Score are computed for every job.

---

## Key Features

| Feature | Detail |
|---|---|
| **PHI Scanner** | 18 HIPAA identifiers checked on upload (column names + value patterns). Blocks processing if detected. |
| **Statistical Profiler** | Learns numeric distributions, categorical frequencies, and pairwise correlations from your source sample |
| **Synthetic Data Similarity Score** | 3-dimensional: Statistical (mean/std), Distribution (overlap), Correlation (Pearson) — composite score 0–100 |
| **Privacy Score** | 0–100 score measuring distance from source records; flags anything below 85 |
| **Referential Integrity** | Every Claims row references a valid Provider and Member. Auto-fixes inconsistencies before download. |
| **Scope Refusals** | Pharmacy, prior auth, non-US market, and >100k row requests are refused with a clear message |
| **No-upload path** | 6 predefined prompt buttons generate realistic data from domain knowledge alone |
| **Key security** | `ANTHROPIC_API_KEY` is proxy-injected server-side — never reaches the browser bundle |

---

## Output Format

Single consolidated flat CSV — fully denormalised. All 17 fields per row:

| Field | Example | Notes |
|---|---|---|
| `ClaimID` | `CLM-SYN-0000001` | Zero-padded 7-digit synthetic ID |
| `ProviderID` | `NPI-SYN-0000001` | Synthetic NPI format |
| `FacilityName` | `Sunrise Medical Center` | Synthetic facility name |
| `ProviderType` | `Hospital` | |
| `Specialty` | `Orthopedics` | Derived from HCPCS range |
| `ProviderState` | `TX` | 2-letter state code |
| `ProviderZipCode` | `75201` | Synthetic, structurally valid |
| `MemberID` | `CMB-SYN-0000001` | Synthetic member ID |
| `DateOfBirth` | `1968/04/22` | Adults born 1940–1985 |
| `Gender` | `F` | `M` or `F` |
| `MemberState` | `FL` | |
| `MemberZipCode` | `33101` | |
| `InsuranceType` | `Commercial` | Commercial / Medicare / Medicaid |
| `DateOfService` | `2025/09/14` | 2025–2026 only, `YYYY/MM/DD` |
| `HCPCSCode` | `27447` | Specialty-appropriate range |
| `BilledAmount` | `42500.00` | Numeric, no `$` or commas |
| `ClaimStatus` | `Paid` | `Paid` / `Pending` / `Denied` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Routing | React Router v6 |
| CSV parsing | PapaParse (client-side) |
| AI model | Anthropic Claude (`claude-sonnet-4-6`) |
| API security | Server-side proxy — key injected by `vite.config.ts`, never in browser |
| Backend | None — Vite dev server acts as the API proxy |
| Database | None in v1 (Supabase planned) |
| Auth | None (internal tool) |

---

## App Screens

```
Dashboard → Job Setup → Schema Review → Generation Progress → Compliance Report
```

| Screen | What happens |
|---|---|
| **Dashboard** | Recent jobs list, "New Generation Job" button |
| **Job Setup** | Prompt input, CSV + schema upload, PHI scan result |
| **Schema Review** | Auto-detected field table, row count input, specialty clarification |
| **Generation Progress** | Live progress bar, rotating status messages, 60-min timeout guard |
| **Compliance Report** | Privacy Score, Similarity Score (3 dimensions), 10-row sample, CSV download |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- An [Anthropic API key](https://console.anthropic.com/api-keys)

### Install

```bash
git clone https://github.com/godave81/Cynthia.git
cd Cynthia
npm install
```

### Configure API key

```bash
cp .env.local.example .env.local
# Edit .env.local and set your key:
# ANTHROPIC_API_KEY=sk-ant-...
```

> ⚠️ The key uses no `VITE_` prefix — it is intentionally server-side only and injected by the Vite proxy. Never prefix it with `VITE_`.

### Run

```bash
npm run dev
# App available at http://localhost:3456
```

### TypeScript check

```bash
npx tsc --noEmit
```

---

## Project Structure

```
Cynthia/
├── vite.config.ts                  Dev server + API proxy (key injection)
├── .env.local                      ANTHROPIC_API_KEY (gitignored)
├── .env.local.example              Safe template to commit
└── src/
    ├── App.tsx                     Router setup
    ├── context/
    │   └── JobContext.tsx          Global job state
    ├── pages/
    │   ├── Dashboard.tsx
    │   ├── JobSetup.tsx            PHI scan, file upload
    │   ├── SchemaReview.tsx        Schema table, row cap, specialty banner
    │   ├── GenerationProgress.tsx  API call, integrity fix, scoring
    │   └── ComplianceReport.tsx    Scores, sample table, CSV download
    └── utils/
        ├── systemPrompt.ts         Claude system prompt + hard rules
        ├── generator.ts            API call, parser, output validator
        ├── phiScanner.ts           18 HIPAA identifier scanner
        ├── schemaParser.ts         CSV + schema file parser
        ├── statisticalProfiler.ts  Source data distributions
        ├── similarityScore.ts      3-dimension similarity scoring
        ├── integrityValidator.ts   Referential integrity + auto-fix
        ├── privacyScore.ts         Privacy Score 0–100
        └── csvBuilder.ts           Consolidated flat CSV builder
```

---

## Scope Boundaries

Cynthia v1 supports **U.S. medical claims only**. The following are explicitly refused:

- Pharmacy claims (different coding system — NDC vs HCPCS)
- Prior authorization data
- Non-US market data
- Jobs requesting > 100,000 rows
- Source uploads containing detected PHI

---

## Compliance Behaviour

- **PHI on upload** → blocked immediately, column names listed, file not processed
- **Scope out of bounds** → AI returns structured `{"error": "REFUSAL", "message": "..."}` JSON
- **Integrity violations** → auto-corrected before Compliance Report; report notes rows normalised
- **Small source sample (<50 rows)** → generates successfully, report flags limited statistical confidence
- **Generation timeout (60 min)** → graceful timeout UI, no partial download offered

---

## Test Coverage

All 17 PRD Section 8 test cases verified (Milestone 7):

| Category | Cases | Status |
|---|---|---|
| Must-pass | 7 | ✅ All pass |
| Edge cases | 5 | ✅ All pass |
| Must-fail-safely | 5 | ✅ All pass |
| PHI audit (5 × 20-row batches) | — | ✅ Zero hits |
| TypeScript | — | ✅ 0 errors |

---

## Roadmap

| Item | Status |
|---|---|
| Supabase job history persistence | Planned |
| Streaming / batched generation for large row counts | Planned |
| User authentication | Planned |
| Observability + logging (PRD Section 9) | Planned |
| JSON + Parquet output formats | Planned |
| ICD-10 diagnosis code generation | Planned |

---

## Constraints to Know

- **Single API call per job** — practical generation limit before response truncation is ~50–100 rows. For production-scale jobs (5k+), a streaming/batching architecture is needed.
- **No persistence** — job state lives in React context. Refreshing the page resets everything.
- **No backend** — all processing (PHI scan, profiling, scoring, integrity fix) runs client-side in the browser.

---

*Internal tool — not for external distribution or use with real patient data.*
