# HANDOVER.md — Cynthia Project

**Date:** 2026-06-05  
**Status:** All 7 milestones complete. Deployed to production. Landing page live.  
**GitHub:** https://github.com/godave81/Cynthia (private)  
**Live app:** https://cynthia-godave81-s-projects.vercel.app  
**Session history:** Full transcript at `/Users/davidmunoz/.claude/projects/-Users-davidmunoz-Documents-Documents---David-s-MacBook-Air-JUSTANOTHERPM-aipm-main/`

---

## 1. What Cynthia Is

An internal web app that generates HIPAA-compliant synthetic U.S. medical claims data. Output is a single consolidated flat CSV with Provider + Member + Claims fields inline (fully denormalized). Used by healthcare analytics teams to create training/demo data without real PHI.

**Users:** Data scientists at healthcare analytics companies  
**Not for:** External use, real patient data, PHI storage

---

## 2. Project Location

**IMPORTANT — iCloud path:** The project is inside iCloud Drive and the path contains a Unicode apostrophe. Direct bash `cd` and `cat` commands can fail. Always locate the project using Python's `os.walk`:

```python
import os
for root, dirs, files in os.walk(os.path.expanduser('~/Documents')):
    depth = root.replace(os.path.expanduser('~/Documents'), '').count(os.sep)
    if depth > 6:
        dirs.clear()
        continue
    if 'package.json' in files and 'vite.config.ts' in files:
        project = root
        break
```

Always write files via Python subprocess with `sys.argv[1]` or use `open(path, 'w')` from Python. Never use bash heredocs or `echo >` for this path.

---

## 3. Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Routing | React Router v6 |
| CSV parsing | PapaParse (client-side) |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) |
| API key (dev) | Vite dev server proxy injects from `.env.local` |
| API key (prod) | Vercel serverless function injects from env var |
| Auth | None (internal tool) |
| Backend | None — Vite dev server (dev) / Vercel functions (prod) act as proxy |
| DB | None (Supabase planned for future milestones) |
| Hosting | Vercel (auto-deploy on push to `main`) |

---

## 4. Dev Server

```bash
# Start dev server (port 3456)
npm run dev
```

- Dev server: `http://localhost:3456`
- Landing page: `http://localhost:3456/`
- App: `http://localhost:3456/app`
- Proxy: all requests to `/api/anthropic/*` → `https://api.anthropic.com/*` with API key injected server-side via `vite.config.ts`

**TypeScript check:** `npx tsc --noEmit` (run from project root) — should be clean.

---

## 5. API Key Setup

### Local development
- File: `.env.local` in project root (gitignored — never committed)
- Variable: `ANTHROPIC_API_KEY` (no `VITE_` prefix — key never goes to browser)
- Key is injected by `vite.config.ts` via `proxy.on('proxyReq')` using `fs.readFileSync`
- Template: `.env.local.example` is committed and safe to share

### Production (Vercel)
- Set in Vercel dashboard → Project Settings → Environment Variables
- Variable name: `ANTHROPIC_API_KEY` — set for Production + Preview + Development
- Injected at runtime by `api/anthropic/v1/messages.ts` serverless function via `process.env`
- If key changes: update in Vercel dashboard → Deployments → Redeploy (no cache)

---

## 6. File Map

```
Cynthia/
├── README.md                       GitHub-facing project documentation
├── PRD.md                          Product requirements
├── TASKS.md                        Milestone checklist (all complete)
├── CLAUDE.md                       Claude-specific instructions
├── DECISIONS.md                    Architecture decisions log
├── PLANNING.md                     System design notes
├── HANDOVER.md                     This file — session context for new Claude sessions
├── vercel.json                     Vercel build config (buildCommand, outputDirectory, framework)
├── .gitignore                      Excludes node_modules, dist, .env.local, .DS_Store, .vercel
├── vite.config.ts                  Dev server + API proxy (key injection in dev)
├── .env.local                      ANTHROPIC_API_KEY (gitignored)
├── .env.local.example              Safe template (committed)
├── api/
│   └── anthropic/
│       └── v1/
│           └── messages.ts         Vercel serverless function — proxies to Anthropic, injects key
└── src/
    ├── App.tsx                     Router: / → Landing, /app → Dashboard, /jobs/* → app screens
    ├── context/
    │   └── JobContext.tsx          Global job state (prompt, files, scores, results)
    ├── pages/
    │   ├── Landing.tsx             Marketing landing page (/ route) — for demos
    │   ├── Dashboard.tsx           Screen 1 — home, recent jobs list (/app route)
    │   ├── JobSetup.tsx            Screen 2 — prompt entry, file uploads, PHI scan
    │   ├── SchemaReview.tsx        Screen 3 — schema table, row count, generate button
    │   ├── GenerationProgress.tsx  Screen 4 — progress bar, API call, integrity fix
    │   └── ComplianceReport.tsx    Screen 5 — scores, sample table, CSV download
    ├── utils/
    │   ├── systemPrompt.ts         Claude system prompt (role, hard rules, output format)
    │   ├── generator.ts            API call, response parser, output validator
    │   ├── phiScanner.ts           18 HIPAA identifier scanner (column name + value patterns)
    │   ├── schemaParser.ts         Auto-detect schema from CSV, parse schema files
    │   ├── statisticalProfiler.ts  Numeric/categorical distributions from source CSV
    │   ├── similarityScore.ts      3-dimension similarity: statistical, distribution, correlation
    │   ├── integrityValidator.ts   Referential integrity check + in-memory auto-fix
    │   ├── privacyScore.ts         Privacy Score 0-100 from validation issues
    │   └── csvBuilder.ts           Build consolidated flat CSV from generated rows
    └── components/
        ├── ScoreBadge.tsx          Colored score display (green ≥85, yellow ≥70, red <70)
        ├── StatusBadge.tsx         Job status pill
        ├── StepIndicator.tsx       3-step progress indicator
        └── UploadZone.tsx          Drag-and-drop file upload zone
```

---

## 7. Routing

| URL | Component | Notes |
|---|---|---|
| `/` | `Landing.tsx` | Public-facing marketing/demo page |
| `/app` | `Dashboard.tsx` | App home — recent jobs, new job button |
| `/jobs/new` | `JobSetup.tsx` | Prompt entry + file upload |
| `/jobs/new/configure` | `SchemaReview.tsx` | Schema review + row count |
| `/jobs/processing` | `GenerationProgress.tsx` | Generation in progress |
| `/jobs/report` | `ComplianceReport.tsx` | Scores + download |

**Navigation links:**
- Landing "Launch App →" → `/app`
- Dashboard logo → `/` (landing)
- ComplianceReport "Back to Dashboard" → `/app`
- Dashboard "New Generation Job" → `/jobs/new`

---

## 8. Data Flow

```
User
 │
 ├─ No-upload path (predefined prompts)
 │   JobSetup → GenerationProgress → ComplianceReport
 │                    │
 │                    └── generateSyntheticData(prompt)
 │                         └── POST /api/anthropic/v1/messages
 │                              ├── DEV:  Vite proxy → api.anthropic.com (key from .env.local)
 │                              └── PROD: Vercel fn → api.anthropic.com (key from env var)
 │
 └─ Upload path (custom prompt + source CSV + optional schema)
     JobSetup (PHI scan → pass)
      → SchemaReview (row count, specialty clarification)
       → GenerationProgress
            ├── profileData(sourceRows)         statistical distributions
            ├── buildUploadPathPrompt(...)       augment prompt with profile + rules
            ├── generateSyntheticData(prompt)   API call
            ├── validateIntegrity(rows)          integrity check
            ├── fixIntegrityViolations(rows)     auto-fix if needed
            ├── calculateSimilarityScore(...)    3-dim similarity
            └── → ComplianceReport              scores + sample + download
```

---

## 9. Output Format

Single flat CSV. All 17 fields per row:

| Field | Description |
|---|---|
| ClaimID | `CLM-SYN-0000001` (7-digit zero-padded) |
| ProviderID | `NPI-SYN-0000001` |
| FacilityName | Synthetic facility name |
| ProviderType | Hospital / Clinic / etc. |
| Specialty | E.g. Orthopedics, Cardiology |
| ProviderState | 2-letter state code |
| ProviderZipCode | 5-digit (synthetic range) |
| MemberID | `CMB-SYN-0000001` |
| DateOfBirth | `YYYY/MM/DD` (adults 1940–1985) |
| Gender | `M` or `F` |
| MemberState | 2-letter state code |
| MemberZipCode | 5-digit (synthetic range) |
| InsuranceType | Commercial / Medicare / Medicaid |
| DateOfService | `YYYY/MM/DD` (2025–2026 only) |
| HCPCSCode | 5-char code (specialty-appropriate range) |
| BilledAmount | Numeric string, no `$` or commas |
| ClaimStatus | `Paid` / `Pending` / `Denied` |

---

## 10. Key Behaviors to Know

**PHI Scanner** (`phiScanner.ts`):
- Runs on source CSV BEFORE processing (upload path only)
- Blocks upload if column NAME matches known PHI field names (SSN, DOB, name, email, phone, MRN, address…)
- Also blocks if >10% of values match a PHI regex (SSN format, phone, email, IP, URL, VIN)
- Also catches two-word title-case value patterns (person names like "John Smith")
- Note: Facility names like "Sunrise Medical Center" are exempt because column name is not in PHI map

**Clarification banner** (`SchemaReview.tsx`):
- Fires when prompt has no specialty keyword from: `orthopedic, ortho, cardiology, cardiac, cardio, surgery, surgical, evaluation, management, e&m, em , general, musculoskeletal`
- Shows a text input — user can optionally specify procedure type
- If left blank, AI defaults to E&M codes

**Row cap:**
- UI: `SchemaReview.tsx` disables Generate button and shows error for >100,000
- API layer: `GenerationProgress.tsx` also checks and throws before API call

**Scope refusals:**
- AI returns `{"error": "REFUSAL", "message": "..."}` JSON for pharmacy, prior auth, non-US prompts
- `generator.ts:parseResponse()` catches this and throws as Error
- `GenerationProgress.tsx` displays it in the error state

**Timeout:**
- 60-minute hard timeout in `GenerationProgress.tsx`
- Shows dedicated timeout UI with "Return to Dashboard" button

**Integrity auto-fix:**
- If multiple rows with same ProviderID have inconsistent provider fields → normalised to first-seen profile
- Duplicate ClaimIDs → re-sequenced above max existing CLM-SYN number

---

## 11. Milestone Status

| # | Milestone | Status |
|---|---|---|
| 1 | Static UI + Navigation | ✓ Complete |
| 2 | PHI Scanner + File Upload | ✓ Complete |
| 3 | Core AI Generation (no-upload path) | ✓ Complete |
| 4 | Upload path + Statistical Profiler + Similarity Score | ✓ Complete |
| 5 | Referential Integrity + Auto-fix | ✓ Complete |
| 6 | Edge Cases + Safety Refusals | ✓ Complete |
| 7 | Full PRD Section 8 Test Validation | ✓ Complete |

**All PRD Section 8 tests verified (17/17):**
- 7 must-pass cases ✓
- 5 edge cases ✓
- 5 must-fail-safely cases ✓
- Final PHI audit (5 diverse batches, 20 rows each) — zero hits ✓
- TypeScript: 0 errors ✓

---

## 12. GitHub Repository

**URL:** https://github.com/godave81/Cynthia  
**Visibility:** Private  
**Branch:** `main`  
**Key commits:**
- `b7b0a03` — Initial commit — Cynthia v1.0 (40 files)
- `2ec3978` — Add README.md
- `6349aa6` — Update HANDOVER.md
- `12203e2` — Add Vercel deployment config and serverless API proxy
- `a5d3634` — Update HANDOVER.md (Vercel section)
- `7dc525b` — Add landing page for product demo

**What is committed:** All source files, config, docs, and `api/` serverless function  
**What is gitignored:** `.env.local`, `node_modules/`, `dist/`, `.DS_Store`, `.vercel/`

**Git tooling:** GitHub CLI (`gh`) installed at `/opt/homebrew/bin/gh` via Homebrew. Authenticated as `godave81`.

**To push future changes:**
```bash
git add <files>
git commit -m "your message"
git push origin main   # triggers auto-deploy on Vercel
```

---

## 13. Vercel Deployment

**Live URL:** https://cynthia-godave81-s-projects.vercel.app  
**Platform:** Vercel  
**Auto-deploy:** Every push to `main` on GitHub triggers a new production deployment  

**Production smoke test results (2026-05-31):**
- Frontend loads: ✅ 200 OK
- API proxy + key injection: ✅ confirmed
- Scope refusal (pharmacy): ✅ correct JSON refusal returned
- End-to-end generation: ✅ 3 claims, CLM-SYN IDs, dates in 2025–2026

**How the API proxy works in production:**
- Client POSTs to `/api/anthropic/v1/messages` (no API key in request)
- `api/anthropic/v1/messages.ts` serverless function runs on Vercel Node.js runtime
- Function reads `ANTHROPIC_API_KEY` from `process.env` and forwards to `api.anthropic.com`
- Response returned to client — key never touches the browser

**Environment variable:**
- Name: `ANTHROPIC_API_KEY`
- Set in: Vercel dashboard → Project Settings → Environment Variables → Production + Preview + Development
- To update: change value in dashboard → Deployments → Redeploy (no cache)

**⚠️ Vercel function timeout:**
- Hobby plan: 10-second hard limit — will timeout on most real generations (Anthropic calls take 15–60s+)
- Pro plan ($20/mo): up to 300 seconds — `maxDuration: 300` is already set in the function config
- For production use with real row counts, Pro plan is required

**To redeploy manually:**
- Push any commit to `main` on GitHub (recommended)
- Or: Vercel dashboard → Deployments → ••• on latest → Redeploy (uncheck "Use Build Cache")

---

## 14. Landing Page

**URL:** https://cynthia-godave81-s-projects.vercel.app/  
**File:** `src/pages/Landing.tsx`  
**Purpose:** Product demo and internal stakeholder intro page  

**Sections:**
1. **Nav** — dark bar, Cynthia logo + "Launch App →" CTA
2. **Hero** — dark background, headline "Synthetic Healthcare Data. Without the Wait.", stats bar (17/17 tests, 18 HIPAA identifiers, 100k rows)
3. **Problem** — 3 pain cards: weeks of legal review, Excel fabrication, compliance risk
4. **How it works** — 3 numbered steps: prompt → upload → download
5. **Features** — 4 safeguard cards: PHI Scanner, Statistical Profiler, Referential Integrity, Compliance Report
6. **CTA** — "Ready to generate?" + Launch button
7. **Footer** — "Internal Tool · HIPAA-safe · Zero PHI"

**Demo flow:** Share landing URL → show stakeholders the product story → click "Launch App →" → live demo of the generation workflow.

---

## 15. Known Constraints / Gotchas

1. **iCloud path** — always use Python `os.walk` to resolve project path; bash `cd` unreliable
2. **API key (dev)** — in `.env.local` as `ANTHROPIC_API_KEY` (no VITE_ prefix). Restart dev server after any key change
3. **API key (prod)** — in Vercel env vars. Must redeploy (no cache) after any change
4. **Token limit** — `max_tokens: 4096` in `generator.ts`. If responses truncate, increase to 8192
5. **No backend** — all processing is client-side. API calls go through Vite proxy (dev) or Vercel function (prod)
6. **Row count for generation** — practical limit ~50–100 rows per single API call before truncation. For 5k+ rows, a streaming/batching architecture is needed
7. **No persistence** — job state lives in React context (in-memory). Refreshing the page resets everything
8. **Vercel Hobby timeout** — 10s limit will break most real generations; Pro plan required for production use

---

## 16. What Could Come Next (not started)

Per PRD, future milestones could include:
- Supabase integration (job history persistence)
- Streaming generation for large row counts
- User authentication
- Observability / logging (PRD Section 9)
- Batch job queue
- Custom domain for Vercel deployment

No work has started on any of these.

---

## 17. How to Start a New Claude Session

1. Open Claude Code in the Cynthia project directory, or share this file
2. Say: *"Read HANDOVER.md and continue working on Cynthia"*
3. Claude should re-read `CLAUDE.md`, `TASKS.md`, and `PRD.md` for live state
4. Dev server: `npm run dev` (port 3456) — landing at `/`, app at `/app`
5. GitHub: https://github.com/godave81/Cynthia
6. Live app: https://cynthia-godave81-s-projects.vercel.app

---

*Updated 2026-06-05 — Landing page added for product demo*
