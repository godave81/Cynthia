# CLAUDE.md — Cynthia: Healthcare Synthetic Data AI Agent
**Version:** 1.0

---

## Product Context

Cynthia is an internal web-based tool for U.S. healthcare analytics companies. Data scientists and application developers upload a source sample CSV (≤5,000 rows) and a schema file, write a natural language prompt describing what they need, and Cynthia generates a synthetic U.S. medical claims dataset as a single consolidated CSV. If users have no sample or schema, they can click a predefined prompt button to generate random realistic data from domain knowledge. Every job produces a Compliance Report with a Privacy Score and (when a source sample is provided) a Synthetic Data Similarity Score. Zero HIPAA identifiers are permitted in any output.

**Core user flow:**
1. User lands on Dashboard — sees recent jobs
2. User clicks "New Generation Job" → Job Setup screen
3. User writes a prompt OR clicks a predefined prompt button; optionally uploads source sample + schema with field rules
4. PHI scan runs on upload — blocks if any of the 18 HIPAA identifiers detected **[AI MOMENT]**
5. User reviews parsed schema and field rules → sets row count → clicks Generate
6. Cynthia generates consolidated CSV **[AI MOMENT]** → Progress screen
7. User reviews Compliance Report (Privacy Score + Similarity Score + 10-row sample) → downloads CSV **[AI MOMENT]**

---

## AI Behavior Rules

**The AI always:**
1. Generates obviously fake names (e.g., "Maria Claimson"), structurally valid but non-real zip codes, and clearly synthetic IDs (NPI-SYN-XXXXXXX, CMB-SYN-XXXXXXX, CLM-SYN-XXXXXXX)
2. Maintains referential integrity — every Claims row references a valid Provider and Member from the same generated dataset
3. Applies schema field rules when present; defaults to U.S. healthcare domain knowledge when no rule is found
4. Generates dates of service within 2025-01-01 to 2026-12-31 in YYYY/MM/DD format
5. Selects HCPCS codes appropriate to the procedure type in the prompt (orthopedic: 27xxx, cardiology: 92xxx–93xxx, general surgery: 10xxx–19xxx, E&M: 99202–99499)

**The AI never:**
1. Includes any of the 18 HIPAA identifiers in output — not partially, not as initials, not derived from source data
2. Generates pharmacy claims, prior authorization, dental, vision, or non-U.S. market data
3. Processes a source file that contains detected PHI — refuses immediately and names the specific columns
4. Generates more than 100,000 records in a single job
5. Reproduces any value verbatim from the source dataset for any potentially identifying field

---

## Coding Behavior Rules

**1. Think before coding.**
- State assumptions explicitly before implementing. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

**2. Simplicity first.**
- Minimum code that solves the problem. Nothing speculative.
- No features beyond what's in PRD.md.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- If you write 200 lines and it could be 50, rewrite it.

**3. Surgical changes.**
- Touch only what you must. Clean up only your own mess.
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

**4. Stay aligned with specs.**
- Before starting any milestone, re-read TASKS.md and PRD.md. Use the current version, not memory of an earlier version.
- Never add screens, features, or UI elements not in PLANNING.md.
- When in doubt, check the spec. If the spec doesn't cover it, ask.

---

## Key Technical Decisions
- **Output:** Single consolidated flat CSV — Provider, Member, and Claims fields in one file. Not three separate files. Not a ZIP.
- **PHI scanning:** Runs client-side before any data leaves the browser. Blocks upload if >10% column hit rate on any HIPAA identifier pattern.
- **No-upload path:** Skip Schema Review step entirely. Show predefined prompt buttons. Report shows Privacy Score only — Similarity Score is hidden with explanatory note.
- **Schema rules:** Schema file can include per-field generation rules. Rules override domain knowledge defaults. Missing rules fall back to healthcare domain knowledge.
- **Source data:** Never written to the database. Processed in-memory only. Purged at session end.
- **Generated CSVs:** Held temporarily for download. Purged after 24 hours.
- **Row cap:** 100,000 records hard limit. Refuse before generation starts — never mid-run.

---

## File Locations

| File | Purpose |
|---|---|
| `/docs/PRD.md` | What we're building, quality examples, test set, constraints |
| `/docs/PLANNING.md` | Screen-by-screen spec, system prompt, design tokens, tech stack |
| `/docs/TASKS.md` | Milestone build order with success criteria and test case references |
| `/docs/CLAUDE.md` | This file — persistent rules for every coding session |
| `/docs/DECISIONS.md` | Log of product decisions made during spec and build |

---

*CLAUDE.md — Cynthia v1.0*
