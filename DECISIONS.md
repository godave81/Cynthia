# DECISIONS.md — Cynthia: Healthcare Synthetic Data AI Agent
**Version:** 1.0

---

## How to use this file
After every significant decision during your build, add an entry below.
A "significant decision" = choosing between alternatives, changing your plan, or cutting scope.

### [2025-05-22] — V1 scope locked to medical claims CSV only

**Context:** Product supports multiple output formats (CSV, JSON, Parquet) and multiple claim types (medical, pharmacy, prior auth). Needed to define the thinnest v1 slice.

**Options considered:**
- Build all three output formats from the start
- Build CSV only and add JSON/Parquet in v2
- Build medical + pharmacy claims together since both use HCPCS-adjacent coding

**Decision:** V1 delivers medical claims in CSV only. Pharmacy, prior authorization, dental, and vision are explicit refusals.

**Why:** CSV covers 100% of v1 use cases. JSON and Parquet add infrastructure complexity with no incremental user value at this stage. Pharmacy claims use NDC codes — a different coding system that requires separate domain logic. Mixing it in would double the system prompt complexity and testing surface.

**Revisit if:** Users consistently request JSON or Parquet output in early usage feedback, or if a specific integration need requires a non-CSV format.

---

### [2025-05-22] — Single consolidated CSV instead of three separate files

**Context:** The output consists of three linked data tables: Provider, Member, and Claims. Initial design assumed three separate CSVs in a ZIP download.

**Options considered:**
- Three separate CSVs (Provider.csv, Member.csv, Claims.csv) delivered as a ZIP
- One consolidated flat CSV with all Provider, Member, and Claims fields in a single file

**Decision:** One consolidated flat CSV. ZIP download eliminated.

**Why:** A single flat file is immediately usable — users can open it in Excel or load it into a dataframe without unzipping or joining tables. The referential integrity is preserved through shared ID columns. Simpler download, simpler validation, simpler user experience.

**Revisit if:** Users need the three tables separately for database loading or ETL pipelines — at that point, offer both options.

---

### [2025-05-22] — Synthetic identifiers must look obviously fake

**Context:** Defining what synthetic names, zip codes, and IDs should look like in output.

**Options considered:**
- Use realistic-looking names and zip codes that are statistically plausible but not real
- Use obviously synthetic names (e.g., "Maria Claimson") and non-real zip codes so output is unmistakably artificial

**Decision:** Obviously fake names, non-real zip codes, clearly synthetic ID formats (NPI-SYN-XXXXXXX, CMB-SYN-XXXXXXX, CLM-SYN-XXXXXXX).

**Why:** Realistic-looking synthetic data that could be confused for real records creates compliance risk and erodes trust. If anyone sees the output and wonders "is this real?", the product has failed. Obviously synthetic data removes all ambiguity — it looks real enough to be useful for testing and demos, but no one could mistake it for actual patient data.

**Revisit if:** A specific use case requires highly realistic name/ID formats for demo purposes — add as an opt-in mode with extra compliance warnings.

---

### [2025-05-22] — Predefined prompt buttons for zero-upload path

**Context:** Some users won't have a source sample or schema to upload, or won't know what to generate. Needed to handle this without forcing them through an upload flow.

**Options considered:**
- Require upload for all generation jobs — no exceptions
- Allow free-text prompt only with no upload, generating entirely from domain knowledge
- Provide predefined prompt buttons as one-click starters, skipping upload entirely

**Decision:** Six predefined prompt buttons on the Job Setup screen. When clicked, Schema Review step is skipped. Report shows Privacy Score only — Similarity Score is hidden with an explanatory note.

**Why:** Forcing upload creates friction for users who just want to see the product work or generate quick test data. Predefined prompts lower the barrier to first value. Hiding the Similarity Score on the no-upload path is honest — there's no source data to compare against, so the score would be meaningless.

**Revisit if:** Usage data shows most users skip upload entirely — consider making upload fully optional by default rather than a secondary path.

---

### [2025-05-22] — Schema file carries per-field generation rules

**Context:** Users need control over how specific fields are generated — for example, restricting states, setting dollar amount ranges, or locking procedure types.

**Options considered:**
- Rules specified only through the natural language prompt
- Rules embedded in the schema file as a per-field attribute
- Separate "rules configuration" UI step after schema review

**Decision:** Schema file carries per-field generation rules. If a rule exists for a field, Cynthia applies it. If no rule, defaults to U.S. healthcare domain knowledge.

**Why:** Embedding rules in the schema keeps configuration close to the data structure it describes. Users who already have a schema can add rules without learning a new UI. It also scales — a schema with 40 fields can carry 40 rules without cluttering the prompt. The natural language prompt remains for high-level intent; the schema handles field-level precision.

**Revisit if:** Users find schema rule syntax confusing — consider adding a rules UI layer on the Schema Review screen as a v2 enhancement.

---


### [2026-05-24] — Report screen includes 10-row sample data table in Milestone 1

**Context:** PLANNING.md Screen 5 explicitly listed "Row-level data preview or sample records display" under "Does NOT include." TASKS.md Milestone 1 listed "10-row sample data table (hardcoded)" as a required subtask.

**Options considered:**
- Follow PLANNING.md — omit the sample table entirely
- Follow TASKS.md — include the hardcoded 10-row table

**Decision:** Include the 10-row hardcoded sample table. TASKS.md takes precedence for M1 implementation.

**Why:** TASKS.md is the build specification; PLANNING.md was written before the build plan was finalized. The table helps validate that the hardcoded data looks correct before AI generation is connected. The PLANNING.md exclusion likely reflects the final production design (no live row preview), which will be revisited when AI output is real.

**Revisit if:** When AI generation is connected in M3, decide whether to keep the sample table in the live product or remove it per PLANNING.md's original spec.

---


### [2026-05-24] — PHI scanner uses column-name heuristics as primary signal for hard-to-pattern identifiers

**Context:** Choosing the detection strategy for HIPAA identifiers like full names, addresses, and medical record numbers — identifiers whose values don't have a reliable regex pattern.

**Options considered:**
- Value-pattern-only detection (regex over values, >10% threshold) — simple but misses names
- Column-name heuristic only — fast but fragile if columns are oddly named
- Column-name heuristic first, fall back to value patterns — layered defense

**Decision:** Column-name heuristic triggers an immediate block (no threshold needed). Value-pattern regex applies to columns whose names don't match. The >10% threshold applies only to value-pattern matches to avoid false positives on legitimate code fields.

**Why:** A column literally named "ssn" or "dob" should be caught even if its values look like integers. Column names are the strongest signal for human-assigned PHI fields. Value patterns catch cases where PHI is smuggled in under an innocuous column name.

**Revisit if:** False-positive rate on real schema column names is high — consider a case-insensitive allowlist of safe names to skip.

---

### [2026-05-24] — Schema file parsed client-side; no server storage

**Context:** Schema files contain field definitions and generation rules. Deciding where to parse them.

**Decision:** Schema files are parsed entirely in the browser using Papa Parse (CSV) or JSON.parse (JSON). No file content leaves the browser. The parsed SchemaField[] array is stored in React Context (in-memory only).

**Why:** Consistent with CLAUDE.md data handling rules — source data never written to database or stored beyond active session. Client-side parsing keeps the entire data flow in the browser for both PHI scanning and schema parsing.

**Revisit if:** Schema files grow very large (>10MB) and browser memory becomes an issue — at that point, consider a server-side parse step.

---

### [2026-05-31] — M3 output format confirmed: single consolidated flat CSV

**Context:** PLANNING.md system prompt specified three separate CSV files (Provider.csv, Member.csv, Claims.csv) as output. CLAUDE.md explicitly states "single consolidated flat CSV — Provider, Member, and Claims fields in one file. Not three separate files. Not a ZIP." This conflict was raised at M3 kickoff.

**Decision:** Confirmed single consolidated flat CSV. PLANNING.md system prompt updated for M3 to request one flat JSON array per job (one row per claim, fully denormalized with Provider and Member fields inline). CLAUDE.md takes precedence over PLANNING.md for this decision.

**Why:** A single flat file is immediately usable without joins. Consistent with the earlier DECISIONS.md entry from 2025-05-22. Simpler download, simpler validation.

**Revisit if:** Users running ETL pipelines need normalized separate tables — add a "split export" option in v2.

---

### [2026-05-31] — Anthropic API accessed via Vite dev proxy (API key never in browser bundle)

**Context:** M3 requires calling the Anthropic API from the React app. Direct browser calls expose the API key in the client bundle. Supabase Edge Functions (PLANNING.md backend) are not yet set up.

**Decision:** Vite dev server proxy routes /api/anthropic → api.anthropic.com. The proxy injects the x-api-key header from ANTHROPIC_API_KEY in .env.local (no VITE_ prefix = not exposed to client). The browser bundle never contains the key.

**Why:** Keeps the API key server-side with zero additional infrastructure. Clean for an internal dev tool. If deployed to production, swap the proxy for a real backend (Supabase Edge Function or simple serverless proxy).

**Revisit if:** The app is deployed beyond the local dev server — at that point, implement the Supabase Edge Function from PLANNING.md.

---


## Future Decisions
*(Continue logging here as you build.)*

---

*DECISIONS.md — Cynthia v1.0*
