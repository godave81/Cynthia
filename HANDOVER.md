# HANDOVER.md — Cynthia Project

**Date:** 2026-05-31  
**Status:** All 7 milestones complete. Product is ready for internal use.  
**GitHub:** https://github.com/godave81/Cynthia (private)  
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
| API key | Server-side proxy injection — NEVER in browser bundle |
| Auth | None (internal tool) |
| Backend | None — Vite dev server acts as proxy |
| DB | None (Supabase planned for future milestones) |

---

## 4. Dev Server

```bash
# Start dev server (port 3456)
# Do this via Python subprocess to handle iCloud path:
import subprocess, os
project = "<resolved path from os.walk above>"
subprocess.Popen(['npm', 'run', 'dev'], cwd=project)
```

Or just open a terminal, `cd` to the project, and `npm run dev`.

- Dev server: `http://localhost:3456`
- Proxy: all requests to `/api/anthropic/*` → `https://api.anthropic.com/*` with API key injected server-side

**TypeScript check:** `npx tsc --noEmit` (run from project root) — should be clean.

---

## 5. API Key Setup

- File: `.env.local` in project root (gitignored — never committed)
- Variable: `ANTHROPIC_API_KEY` (no `VITE_` prefix — key never goes to browser)
- Key is injected by `vite.config.ts` via `proxy.on('proxyReq')` using `fs.readFileSync`
- If key changes, just update `.env.local` and restart the dev server
- Template: `.env.local.example` is committed and safe to share

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
├── .gitignore                      Excludes node_modules, dist, .env.local, .DS_Store
├── vite.config.ts                  Dev server + API proxy (key injection here)
├── .env.local                      ANTHROPIC_API_KEY (gitignored)
├── .env.local.example              Safe template (committed)
└── src/
    ├── App.tsx                     Router setup
    ├── context/
    │   └── JobContext.tsx          Global job state (prompt, files, scores, results)
    ├── pages/
    │   ├── Dashboard.tsx           Screen 1 — home, recent jobs list
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

## 7. Data Flow

```
User
 │
 ├─ No-upload path (predefined prompts)
 │   JobSetup → GenerationProgress → ComplianceReport
 │                    │
 │                    └── generateSyntheticData(prompt)
 │                         └── POST /api/anthropic/v1/messages
 │                              └── Vite proxy → api.anthropic.com (key injected)
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

## 8. Output Format

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

## 9. Key Behaviors to Know

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

## 10. Milestone Status

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

## 11. GitHub Repository

**URL:** https://github.com/godave81/Cynthia  
**Visibility:** Private  
**Branch:** `main`  
**Commits:**
- `b7b0a03` — Initial commit — Cynthia v1.0 (Milestones 1–7 complete) — 40 files, 6,871 insertions
- `2ec3978` — Add README.md with full project documentation

**What is committed:** All source files, config, and docs  
**What is gitignored:** `.env.local` (API key), `node_modules/`, `dist/`, `.DS_Store`

**Git tooling:** GitHub CLI (`gh`) installed at `/opt/homebrew/bin/gh` via Homebrew. Authenticated as `godave81`.

**To push future changes:**
```bash
# From the project directory (use Python subprocess for iCloud path):
git add <files>
git commit -m "your message"
git push origin main
```

---

## 12. Known Constraints / Gotchas

1. **iCloud path** — always use Python `os.walk` to resolve project path; bash `cd` unreliable
2. **API key** — in `.env.local` as `ANTHROPIC_API_KEY` (no VITE_ prefix). Restart dev server after any key change
3. **Token limit** — `max_tokens: 4096` in `generator.ts` for the API call. For large row counts the AI makes multiple implicit chunks in a single call — if responses are truncated, increase `max_tokens` to 8192
4. **No backend** — all processing is client-side (PapaParse, PHI scan, profiler, scorer, integrity fix). API calls go through Vite proxy
5. **Row count for generation** — the AI generates all rows in a single API call. Practical limit before truncation is around 50–100 rows per call with the current prompt length. For production use of large counts (5k+), a streaming/batching architecture would be needed
6. **No persistence** — job state lives in React context (in-memory). Refreshing the page resets everything

---

## 13. What Could Come Next (not started)

Per PRD, future milestones could include:
- Supabase integration (job history persistence)
- Streaming generation for large row counts
- User authentication
- Observability / logging (PRD Section 9)
- Batch job queue

No work has started on any of these.

---

## 14. How to Start a New Claude Session

1. Open Claude Code in the Cynthia project directory, or share this file
2. Say: *"Read HANDOVER.md and continue working on Cynthia"*
3. Claude should re-read `CLAUDE.md`, `TASKS.md`, and `PRD.md` for live state
4. Dev server: run `npm run dev` from the project directory (port 3456)
5. GitHub repo: https://github.com/godave81/Cynthia

---

*Updated 2026-05-31 — GitHub push + README added*
