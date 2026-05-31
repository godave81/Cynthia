# PRD.md — Cynthia: Healthcare Synthetic Data AI Agent
**Version:** 1.0 | **Status:** Draft

---

## 1. The Problem Worth Solving

Meet Jordan. Jordan is a data scientist at a mid-sized U.S. healthcare analytics company. Their team has just won a contract to build an AI model that predicts hospital readmission risk. The client is excited. Leadership is excited. Jordan is not — because Jordan knows what comes next.

The model needs training data. The client has data, but sharing it means months of legal review, BAAs, de-identification audits, and HIPAA compliance checks — all before a single row lands in Jordan's environment. In the meantime, Jordan manually fabricates sample records in Excel, column by column, making up member IDs, NPI numbers, and diagnosis codes. It takes two weeks to build a dataset that's barely representative of the real thing, and a compliance officer still flags it. The AI demo gets pushed.

This is the daily reality for data scientists, application developers, and training teams at healthcare AI companies. Real patient data is locked behind regulatory walls. Synthetic alternatives require manual, error-prone construction that produces data that doesn't look or behave like real healthcare data.

**Better looks like this:** Jordan types a prompt, uploads a 500-row sample with a schema, hits generate, and 20 minutes later downloads a 10,000-row CSV with statistically faithful Provider, Member, and Claims records — valid NPI numbers, realistic HCPCS codes, referential integrity across all three tables, and zero HIPAA identifiers. The compliance report gives it a 97% privacy score. Jordan ships the demo next week.

---

## 2. The User Flow

1. User lands on the Cynthia dashboard (home screen)
2. User clicks "New Generation Job"
3. User types a natural language prompt describing what they need (e.g., "Generate 10,000 commercial insurance claims for orthopedic procedures across 5 states, 2025–2026")
4. User uploads a sample data file (CSV, up to 5,000 rows) and a schema file **[AI MOMENT — Schema parsing and pattern recognition]**
5. User reviews the parsed schema and confirms field mappings
6. User sets generation parameters: number of rows (1–100,000), output format (CSV in v1), date range (within 2025–2026)
7. User submits the generation job
8. **[AI MOMENT — Synthetic data generation]** Cynthia generates the synthetic dataset, learning distributions from the uploaded sample and applying HIPAA compliance rules
9. User receives a generation complete notification (or monitors progress bar)
10. User reviews the Compliance & Quality Report before downloading **[AI MOMENT — Compliance scoring and similarity analysis]**
11. User downloads the dataset (Provider CSV + Member CSV + Claims CSV)

### AI Moment Detail: Schema Parsing and Pattern Recognition (Step 4)
- **Input:** Uploaded CSV (≤5,000 rows) + schema file + user prompt
- **Output:** Parsed field list with inferred data types, detected healthcare domain patterns (NPI, HCPCS, ICD codes), and confirmation of referential key columns
- **Quality bar:** Schema parsing must correctly identify all healthcare-specific field types and flag any fields that appear to contain PHI before proceeding

### AI Moment Detail: Synthetic Data Generation (Step 8)
- **Input:** Parsed schema, source data statistical profile, user prompt, row count, date range
- **Output:** Three linked CSV files (Provider, Member, Claims) with full referential integrity, valid HCPCS codes, realistic $ amounts, dates in YYYY/MM/DD format spanning 2025–2026, and zero HIPAA identifiers
- **Quality bar:** Generated data must pass automated PHI scan (zero hits), maintain referential integrity across all three tables, and reflect the statistical distributions of the source data within acceptable tolerance

### AI Moment Detail: Compliance & Quality Report (Step 10)
- **Input:** Source data statistical profile + generated synthetic dataset
- **Output:** Two-part report:
  - **Privacy Score** (0–100): Measures distance between synthetic and source records; flags any field that risks re-identification
  - **Synthetic Data Similarity Score** (0–100): Composite of Statistical Similarity, Distribution Similarity, and Correlation Preservation scores
- **Quality bar:** Report must be human-readable, non-technical summary with numeric scores plus dimension-level breakdowns; Privacy Score must flag any score below 85 as requiring review

---

## 3. Defining Output Quality

### Always / Never Rules

**The AI must always:**
1. Generate synthetic data using only realistic U.S. healthcare constructs (valid HCPCS code ranges, U.S. state-based providers) with obviously fake names (e.g., "Maria Claimson"), structurally valid but non-real zip codes, and clearly synthetic identifiers (e.g., NPI-SYN-0000001, CMB-SYN-0000001) that cannot be mistaken for real records
2. Maintain referential integrity — every Claims record must reference a valid Provider and Member from the generated tables
3. Generate dates of service within the 2025–2026 calendar range in YYYY/MM/DD format
4. Produce a Compliance Report with both a Privacy Score and Similarity Score for every generation job
5. Explain in plain language how the synthetic data differs from and is not traceable to the source records

**The AI must never:**
1. Reproduce any of the 18 HIPAA identifiers — not even partially (no initials, no partial SSNs, obviously fake names (e.g., "Maria Claimson"), structurally valid but fake zip codes (not real U.S. zip codes), synthetic NPI formats (e.g., "NPI-SYN-0000001"))
2. Generate data for non-medical-claims domains (pharmacy, prior auth, dental, vision, or non-U.S. markets)
3. Accept a source file upload that contains detected PHI — it must refuse and explain what was found
4. Generate more than 100,000 records in a single job
5. Allow the output to contain any value that appears verbatim in the source dataset for fields that could be identifying (names, IDs, addresses)

---

### Quality Examples

#### Example 1 — Clear, well-scoped request

**User input:**
> "Generate 5,000 commercial insurance claims for orthopedic surgeries in Texas and Florida hospitals, spanning 2025–2026."

**GREAT output:**
Three CSVs — Provider, Member, Claims — with:
- Provider table: 50 synthetic hospital facilities across TX and FL with realistic NPI formats, facility names like "Sunrise Medical Center," valid TX/FL addresses (no real street addresses from source), specialty = Orthopedics
- Member table: 5,000 synthetic members with commercial insurance, member IDs in standard commercial format (e.g., "CMB-2025-00001"), DOB ranges that produce adults, state = TX or FL
- Claims table: 5,000 records with HCPCS codes in the 27000–29999 range (musculoskeletal), billed amounts $2,500–$85,000, dates of service randomly distributed across 2025–2026, each claim linked to a valid Provider NPI and Member ID from the generated tables

**Why it's great:** It honors the geographic and clinical scope of the prompt, produces realistic domain-specific codes without hallucinating invalid ones, and the three tables join cleanly.

**BAD output:**
Provider table includes a facility named "St. Mary's Hospital, 1234 Oak Street, Houston TX 77002" — a real address that appeared in the source data — and a claims table where 200 records share the same date of service (2025-01-01), revealing a non-realistic distribution.

**Why it's bad:** It re-uses a real-world address (potential re-identification risk) and produces a statistically implausible date distribution — both destroy trust in the dataset's safety and quality.

---

#### Example 2 — Minimal prompt, infer from schema

**User input:**
> "Generate 1,000 rows."

**GREAT output:**
Cynthia prompts: "I can see from your uploaded schema that you have Provider, Member, and Claims fields. I'll generate 1,000 synthetic claims records matching the structure and distribution of your sample. Confirm to proceed, or specify any adjustments (geography, procedure type, date range)."

**Why it's great:** It doesn't over-generate or under-interpret — it surfaces what it knows and asks for one confirmation rather than guessing silently.

**BAD output:**
Cynthia generates 1,000 rows that only populate the Claims table, leaving Provider and Member tables empty, because the prompt didn't explicitly mention all three.

**Why it's bad:** Referential integrity is a core product promise. Silently generating an incomplete dataset breaks the fundamental contract.

---

#### Example 3 — Edge: user uploads a file with PHI

**User input:**
> Uploads "patient_records_2024.csv" containing real member SSNs and full names

**GREAT output:**
Cynthia stops before processing and responds:
"I detected potential PHI in your uploaded file. The following fields appear to contain HIPAA-protected identifiers: [Social Security Number — column 'SSN'], [Full Name — column 'member_name']. I cannot process this file to protect patient privacy. Please de-identify these fields and re-upload, or upload a schema-only file."

**Why it's great:** It protects the organization from a compliance violation before any data enters the system, names the specific offending fields, and gives the user a clear path forward.

**BAD output:**
Cynthia accepts the file, strips the SSN column silently, and proceeds with generation without alerting the user.

**Why it's bad:** Silent data handling gives users false confidence and creates compliance liability. The user doesn't know what was detected or removed.

---

### Edge Cases

**Edge case 1: Very small source file (under 50 rows)**
User uploads a 30-row sample. Cynthia proceeds but adds a warning in the report: "Your source sample is small (30 rows). Statistical similarity may be limited — distributions are estimated from a small population. Consider uploading a larger sample for higher-quality output." Does not refuse — small samples are valid, just flagged.

**Edge case 2: Row count at the limit (exactly 100,000)**
User requests exactly 100,000 rows. Cynthia accepts and processes. If the user requests 100,001, Cynthia refuses: "Generation is capped at 100,000 records per job to maintain performance and quality. Please reduce your row count and resubmit."

**Edge case 3: Ambiguous procedure scope**
User prompt says "generate claims for common procedures." Cynthia responds: "Can you be more specific about the procedure type? For example: orthopedic, cardiology, general surgery, or another specialty? This helps me select the right HCPCS code ranges. Or I can generate a broad mix — just confirm."

---

## 4. System Type

**Type:** Prompt + Structured Output + Tool Calls

This is not a basic prompt. Cynthia needs to:
1. Parse and analyze an uploaded file to extract statistical distributions (tool call: file processing)
2. Run a PHI detection scan on uploaded files before any processing (tool call: PHI scanner)
3. Generate structured, validated data across three linked tables (structured output)
4. Compute and return a two-part compliance + quality report (structured output)

**What the system prompt must cover:**
- Role: Cynthia is a healthcare synthetic data generation specialist with expertise in HIPAA compliance and U.S. claims data structures
- Hard refusal rules (non-healthcare domains, PHI in source, >100k records, non-U.S. markets)
- HIPAA identifier list to scan for and exclude
- HCPCS code validity ranges and how to select them from user prompts
- Referential integrity requirements across Provider/Member/Claims tables
- Output format and column naming conventions
- Date range constraints (2025–2026, YYYY/MM/DD)
- Tone: professional, precise, clinical — not conversational or casual

**What the system does NOT need:**
- RAG (no retrieval from a live knowledge base — HCPCS codes and NPI formats are embedded in prompt/tool logic)
- Session memory (each generation job is stateless)
- Multi-turn conversation beyond the single generation workflow

---

## 5. Constraints

| Constraint | Target | Why it matters |
|---|---|---|
| Generation latency | ≤ 45 minutes for 100,000 rows | Client SLA — users will abandon jobs that run past 1 hour |
| Input file size | ≤ 5,000 rows source data | Larger files create processing overhead and PHI risk surface |
| Output row cap | ≤ 100,000 rows per job | Quality and performance ceiling — above this, distribution learning degrades |
| PHI detection | 0 false negatives on HIPAA 18 identifiers | A single identifier in output is a compliance violation |
| Privacy Score minimum | Flag anything below 85/100 | Scores below 85 indicate unacceptable re-identification risk |
| Output format (v1) | CSV only | Simplest format — JSON and Parquet are v2 |
| Date range | 2025–2026 only | Scope constraint for v1; expands in v2 |
| Domain | U.S. medical claims only | Product boundary — pharmacy, prior auth, non-U.S. are explicit refusals |
| Cost per generation job | TBD (internal tool, optimize later) | Internal tool — not a hard v1 constraint |
| Privacy | Source data never stored beyond the session | Uploaded patient samples must not persist after job completion |

---

## 6. Assumptions and Risks

| Assumption | Risk if wrong | How to test |
|---|---|---|
| Source samples of ≤5,000 rows are statistically sufficient to learn realistic distributions | Output looks structurally correct but statistically flat — fails the Similarity Score | Run generation from samples of 50, 200, 500, 2,000, 5,000 rows; measure Similarity Score across sizes; if score drops below 70 at small sizes, add a minimum sample size warning |
| Users understand what a schema file is and can provide one | Upload step becomes a friction point and users abandon the flow | Track abandonment rate at the upload step; if >30%, add a schema auto-detection option |
| HCPCS code ranges embedded in the prompt are sufficient for realistic clinical coverage | Generated codes are valid but clinically implausible for the stated procedure type | Build a test set of 10 procedure prompts; have a clinician review output codes; flag >20% implausible rate as a failure |
| 45 minutes is an acceptable wait time for large jobs | Users abandon or lose trust in large generation jobs | Track job completion rate by row count; if drop-off starts below 50,000 rows, optimize the pipeline |
| PHI scanning at upload catches all 18 HIPAA identifiers reliably | Identifiers slip through into source processing, risking re-identification in output | Run PHI scanner against a labeled test set of 50 files with known PHI; require 100% recall before launch |

---

## 7. MVP Scope

### Building in v1:
- Natural language prompt input for generation job configuration
- CSV file upload for source sample (≤5,000 rows) and schema
- PHI detection scan on upload (blocks processing if PHI found)
- Synthetic generation of three linked tables: Provider, Member, Claims (CSV output)
- HCPCS code selection based on prompt-specified procedure type
- U.S. state-based provider data across all 50 states
- Commercial insurance member data
- Date of service generation within 2025–2026 range
- Referential integrity enforcement across all three tables
- Compliance Report: Privacy Score + Synthetic Data Similarity Score (Statistical, Distribution, Correlation dimensions)
- Generation job status/progress tracking
- Download of generated CSVs

### NOT building in v1:
- JSON output format — adds complexity, CSV covers 100% of v1 use cases
- Parquet output format — v2, requires big data infrastructure
- Pharmacy claims — explicit product boundary, different coding systems (NDC vs HCPCS)
- Prior authorization data — different domain, different data model
- Government insurance members (Medicare/Medicaid) — commercial only in v1, Govt adds regulatory complexity
- Multi-job batch processing — single job per session in v1
- Date ranges outside 2025–2026 — v2 expansion
- Persistent job history / saved generations — v2
- User accounts / authentication — internal tool, handled at network level in v1
- API access for programmatic generation — v2
- ICD-10 diagnosis code generation — v2addition to HCPCS
- PDF or Excel report export — plain screen view is sufficient in v1

---

## 8. Test Set

### Must-Pass Cases

| # | Input description | What great looks like |
|---|---|---|
| 1 | Prompt: "5,000 orthopedic claims in Texas, 2025–2026." + valid CSV sample | Three linked CSVs with valid HCPCS 27xxx codes, TX providers, commercial members, zero PHI, referential integrity intact |
| 2 | Prompt: "1,000 records" + schema only (no sample rows) | Cynthia asks for clarification on procedure type before generating, does not silently proceed |
| 3 | Prompt: "10,000 cardiology claims across 10 states" + 500-row sample | Claims contain cardiology HCPCS codes (92xxx range), 10 state distribution, Similarity Score ≥70 |
| 4 | Request for exactly 100,000 rows | Job accepted, completes within 45 minutes, all compliance checks pass |
| 5 | Valid upload + prompt | Compliance Report generated with Privacy Score ≥85 and all three Similarity Score dimensions populated |
| 6 | Provider table spot-check | No two provider records share the same NPI; all NPIs are in valid 10-digit format |
| 7 | Claims date-of-service check | 100% of dates fall within 2025-01-01 to 2026-12-31 in YYYY/MM/DD format |

### Edge Cases

| # | Input description | Expected behavior |
|---|---|---|
| 1 | Source sample with 30 rows | Generates successfully; Compliance Report includes small-sample warning |
| 2 | Prompt requests exactly 100,001 rows | Refused with clear message: cap is 100,000; user prompted to reduce count |
| 3 | Prompt with no geographic specification | Cynthia generates providers across all 50 states with proportional distribution; no error |
| 4 | Uploaded file with no schema, only data | Cynthia auto-detects column types and presents parsed schema for user confirmation |
| 5 | Prompt mentions "pharmacy claims" | Refused: "Pharmacy claims are outside Cynthia's current scope. Only U.S. medical claims are supported." |

### Must-Fail-Safely Cases

| # | Input description | What safe failure looks like |
|---|---|---|
| 1 | Upload file containing real SSNs | PHI scan triggers before processing; user told which columns contain SSNs; file not processed |
| 2 | Prompt: "Generate claims for UK patients" | Refused: "Cynthia only supports U.S. market claims data." |
| 3 | Upload file containing patient full names and birthdates | PHI scan detects Name and Date identifiers; upload rejected; specific columns named in refusal message |
| 4 | Prompt: "Generate 500,000 rows" | Refused with 100,000 row cap message; not partially processed |
| 5 | Prompt: "Generate prior authorization records" | Refused: "Prior authorization data is outside Cynthia's current scope." |

---

## 9. Observability

### What to Log

| What to log | Why |
|---|---|
| User prompt text (length, keyword categories) | Understand common use cases; detect out-of-scope requests |
| Uploaded file row count and field count | Track input sizes; correlate with output quality |
| PHI scan result (pass/fail + identifier types detected) | Compliance audit trail; measure how often users upload PHI accidentally |
| Job configuration (row count requested, format, date range) | Usage patterns; capacity planning |
| Generation duration (total time, time per 10k rows) | Performance monitoring; SLA compliance |
| Privacy Score per job | Track compliance quality over time; alert on degradation |
| Similarity Score per job (all three dimensions) | Track output quality; identify distribution learning failures |
| User action after report display (downloaded / abandoned / regenerated) | Measure output acceptance rate; signal quality problems |
| Error type and frequency (PHI block, scope refusal, timeout) | Identify friction points and failure modes |
| API cost per job (token count in/out) | Cost monitoring for internal tool budgeting |

### Alerts

| Alert | Threshold | Action |
|---|---|---|
| Generation job timeout | Job exceeds 60 minutes | Notify user; log for engineering review; kill job gracefully |
| Privacy Score degradation | Average Privacy Score drops below 85 across last 10 jobs | Engineering alert — model or logic regression suspected |
| PHI upload frequency | >10 PHI-positive uploads in a single day | Notify compliance team — possible misuse or user training gap |
| Job abandonment rate | >40% of jobs not downloaded after report display | Product review — output quality or report UX issue |

---

*PRD.md — Cynthia v1.0*
