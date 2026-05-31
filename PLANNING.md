# PLANNING.md — Cynthia: Healthcare Synthetic Data AI Agent
**Version:** 1.0 | **Status:** Draft

---

## Screens and Navigation

### Screen 1: Dashboard (Home)
**URL:** `/`

**What's on it:**
- Cynthia logo and product name header
- "New Generation Job" primary action button (prominent, top of page)
- Recent jobs list (job name, row count, status badge, date, download button) — empty state on first use
- Status badges: In Progress / Complete / Failed / Blocked (PHI Detected)
- Each completed job row has a "Download" button and a "View Report" link

**Does NOT include:**
- User account management or login screen (internal tool, handled at network level)
- Settings or configuration panel
- Navigation sidebar or tabs
- Any analytics or usage metrics dashboard
- Job history older than current session (v1 is stateless)

**Where it connects:**
- "New Generation Job" → Screen 2 (Job Setup)
- "View Report" → Screen 5 (Compliance Report)
- "Download" → triggers CSV download directly

---

### Screen 2: Job Setup — Prompt & Upload
**URL:** `/jobs/new`

**What's on it:**
- Page title: "New Generation Job"
- Step indicator: Step 1 of 3 — "Describe & Upload"
- Natural language prompt textarea with placeholder: "Describe what you need — procedure type, geography, number of records, date range (e.g., 10,000 orthopedic claims in Texas and Florida, 2025–2026)"
- Character count below textarea
- Upload zone: "Upload Source Sample (CSV, max 5,000 rows)" — drag and drop or browse
- Upload zone: "Upload Schema File (CSV or JSON)" — drag and drop or browse
- File name and row count confirmation displayed after upload
- PHI scan status indicator (scanning… / passed / blocked)
- "Continue" button — disabled until prompt is filled and PHI scan passes
- "Cancel" link back to Dashboard

**Does NOT include:**
- Output format selector (CSV only in v1 — no dropdown needed)
- Advanced configuration options
- Template library or saved prompts
- Multiple file upload (one source sample, one schema per job)

**Where it connects:**
- PHI scan failure → inline PHI block state (same screen, see overlay states)
- "Continue" → Screen 3 (Schema Review)
- "Cancel" → Screen 1 (Dashboard)

**Overlay states:**
- **Scanning:** Spinner + "Scanning for PHI identifiers…" replacing upload confirmation
- **PHI Blocked:** Red alert box listing detected identifier types and columns (e.g., "SSN detected in column 'member_ssn'"). "Continue" button remains disabled. Message: "Remove or de-identify the flagged fields and re-upload to proceed."
- **PHI Passed:** Green checkmark + "No PHI detected. Ready to continue."

---

### Screen 3: Schema Review & Generation Parameters
**URL:** `/jobs/new/configure`

**What's on it:**
- Page title: "Review Schema & Configure"
- Step indicator: Step 2 of 3 — "Review & Configure"
- Schema table: auto-parsed field names, detected data types, detected healthcare field category (e.g., "NPI," "HCPCS Code," "Date of Service," "Billed Amount," "Member ID") — one row per field
- Editable "Field Category" column — user can correct any misdetected category via dropdown
- Generation parameters section:
  - Row count input (numeric, 1–100,000) with label "Records to generate"
  - Date range: pre-filled "2025-01-01 to 2026-12-31" (read-only in v1)
  - Output tables confirmation: Provider ✓ Member ✓ Claims ✓ (display only)
- "Generate" primary button
- "Back" link to Screen 2

**Does NOT include:**
- Output format selector (CSV only)
- Date range editing (locked to 2025–2026 in v1)
- Per-table row count configuration (all three tables scale together)
- Field-level generation rules or custom constraints
- Preview of what generated data will look like

**Where it connects:**
- "Generate" → Screen 4 (Generation Progress)
- "Back" → Screen 2 (Job Setup)

**Overlay states:**
- **Row count over limit:** Inline error below row count input: "Maximum is 100,000 records. Please reduce your count." "Generate" button stays disabled.

---

### Screen 4: Generation Progress
**URL:** `/jobs/:id/processing`

**What's on it:**
- Page title: "Generating Your Dataset"
- Job summary (read-only): prompt text, row count, upload filename
- Progress bar with percentage
- Status message that updates: "Analyzing source distributions…" → "Generating Provider records…" → "Generating Member records…" → "Generating Claims records…" → "Running compliance checks…" → "Complete"
- Estimated time remaining (rough — updates every 30 seconds)
- "Cancel Job" link (available until job completes)

**Does NOT include:**
- Real-time row-by-row generation output
- Preview of partial results
- Ability to modify parameters mid-generation
- Multiple concurrent job tracking

**Where it connects:**
- On completion → Screen 5 (Compliance Report)
- "Cancel Job" → Screen 1 (Dashboard) with job marked cancelled

**Overlay states:**
- **Job failed:** Red error state with message and "Start Over" button back to Screen 2
- **Timeout (>60 min):** "This job is taking longer than expected. We'll notify you when it completes." with option to return to Dashboard

---

### Screen 5: Compliance & Quality Report
**URL:** `/jobs/:id/report`

**What's on it:**
- Page title: "Generation Complete — Review Before Downloading"
- Job summary: prompt, row count, generation time
- **Privacy Score panel:**
  - Large numeric score (0–100) with color indicator (green ≥85, yellow 70–84, red <70)
  - One-sentence plain-language summary (e.g., "Your synthetic data has a very low risk of revealing source patient information.")
  - Expandable detail: which fields scored lowest and why
  - Warning banner if score <85: "This dataset requires review before use. Contact your compliance team."
- **Synthetic Data Similarity Score panel:**
  - Overall composite score (0–100)
  - Three dimension scores displayed as a bar chart or score cards:
    - Statistical Similarity
    - Distribution Similarity
    - Correlation Preservation
  - One-sentence plain-language interpretation per dimension
- **Dataset summary:** Row counts per table (Provider, Member, Claims), field count, date range coverage
- "Download Dataset" primary button — downloads a ZIP containing three CSVs
- "Start New Job" secondary button
- "Back to Dashboard" link

**Does NOT include:**
- Row-level data preview or sample records display
- Ability to regenerate with modified parameters from this screen
- Export of report as PDF (v2)
- Sharing or collaboration features

**Where it connects:**
- "Download Dataset" → ZIP file download (Provider.csv, Member.csv, Claims.csv)
- "Start New Job" → Screen 2 (Job Setup)
- "Back to Dashboard" → Screen 1 (Dashboard)

---

## System Prompt

```
You are Cynthia, a healthcare synthetic data generation specialist. Your sole purpose is to generate compliant, realistic synthetic U.S. medical claims datasets for data scientists and application developers at healthcare analytics companies.

ROLE AND EXPERTISE
You have deep knowledge of U.S. healthcare data structures including HCPCS procedure codes, NPI provider identifier formats, commercial insurance member data, and medical claims billing conventions. You understand HIPAA's 18 protected health identifiers and apply that knowledge to ensure zero PHI appears in any output.

TONE AND PERSONALITY
Professional, precise, and direct. You are a specialist tool, not a conversational assistant. Responses are concise and action-oriented. You do not explain obvious things. When you need clarification, you ask one specific question, not a list of questions.

HARD RULES — ALWAYS
1. All generated names must be obviously synthetic (e.g., "Maria Claimson," "James Synthwick") — never real surnames
2. All zip codes must be structurally valid 5-digit U.S. format but not correspond to real U.S. zip codes
3. All identifiers (NPI, Member ID, Claim ID) must use clearly synthetic formats: NPI-SYN-XXXXXXX, CMB-SYN-XXXXXXX, CLM-SYN-XXXXXXX
4. Every Claims record must reference a valid Provider NPI and Member ID from the generated tables — referential integrity is non-negotiable
5. All dates of service must fall within 2025-01-01 to 2026-12-31 in YYYY/MM/DD format
6. Every generation job must produce all three tables: Provider, Member, and Claims

HARD RULES — NEVER
1. Never include any of the 18 HIPAA identifiers in output — not partially, not as initials, not derived from source data
2. Never generate pharmacy claims, prior authorization records, dental, vision, or non-U.S. market data
3. Never process or generate from a source file that contains PHI — refuse immediately and name the specific fields detected
4. Never generate more than 100,000 records in a single job
5. Never reproduce any value verbatim from the source dataset for any field that could be identifying

OUTPUT FORMAT
- Three separate CSV files: Provider.csv, Member.csv, Claims.csv
- Provider fields: ProviderID (NPI-SYN format), FacilityName (synthetic), ProviderType, Specialty, State, ZipCode (synthetic)
- Member fields: MemberID (CMB-SYN format), DateOfBirth (YYYY/MM/DD, adults only), Gender, State, ZipCode (synthetic), InsuranceType (Commercial)
- Claims fields: ClaimID (CLM-SYN format), ProviderID (FK), MemberID (FK), DateOfService (YYYY/MM/DD), HCPCSCode, BilledAmount, ClaimStatus

HCPCS CODE SELECTION
Select HCPCS codes appropriate to the procedure type specified in the user prompt:
- Orthopedic/musculoskeletal: 27000–29999 range
- Cardiology: 92000–93799 range
- General surgery: 10000–19999 range
- Evaluation & Management (general): 99202–99499 range
- If no procedure type specified, ask the user before generating

REFUSAL LANGUAGE
When refusing, be direct and specific:
- PHI detected: "I detected [identifier type] in column '[column name]'. This file cannot be processed. Please remove or de-identify this field and re-upload."
- Out of scope: "Cynthia only supports U.S. medical claims data. [Requested type] is outside the current scope."
- Over row limit: "Generation is capped at 100,000 records per job. Please reduce your row count."

FEW-SHOT EXAMPLES

Example 1 — Clear prompt:
User: "Generate 5,000 orthopedic claims in Texas and Florida, 2025–2026"
Action: Generate Provider (TX/FL facilities, Orthopedics specialty), Member (TX/FL commercial), Claims (HCPCS 27xxx range, dates distributed across 2025–2026). No clarification needed.

Example 2 — Ambiguous prompt:
User: "Generate 1,000 rows"
Action: "I can see your schema includes Provider, Member, and Claims fields. I'll generate 1,000 synthetic records matching your sample's structure. Can you confirm the procedure type (e.g., orthopedic, cardiology, general) so I can select the right HCPCS codes?"

Example 3 — PHI detected:
User uploads file with SSN column
Action: "I detected Social Security Number (SSN) in column 'member_ssn'. This file cannot be processed. Please remove or de-identify this field and re-upload."
```

---

## Design Direction

**Feel:** Clinical precision meets modern SaaS — clean, whitespace-heavy, confidence-inspiring. Like a compliance dashboard built by people who care about design. Not a legacy healthcare tool, not a generic form. Users should feel like they're using something purpose-built and trustworthy.

**Colors:**
| Role | Hex |
|---|---|
| Background | #F8F9FA |
| Surface (cards, panels) | #FFFFFF |
| Text primary | #1A1D23 |
| Text secondary | #6B7280 |
| Accent (primary actions) | #0F6E56 (deep teal — clinical, trustworthy) |
| Accent hover | #085041 |
| Success / Privacy pass | #1D9E75 |
| Warning | #BA7517 |
| Error / PHI blocked | #A32D2D |
| Border | #E5E7EB |
| Score high (≥85) | #1D9E75 |
| Score mid (70–84) | #BA7517 |
| Score low (<70) | #A32D2D |

**Typography:**
- Font family: Inter (system fallback: sans-serif)
- Body: 14px / line-height 1.6
- Headings: H1 28px, H2 22px, H3 18px — weight 600
- Labels and metadata: 12px / weight 500 / text-secondary color
- Score numbers: 48px / weight 700 / score color

**Spacing:**
- Page padding: 40px horizontal, 32px vertical
- Card padding: 24px
- Section gaps: 32px
- Field gaps: 16px
- Button padding: 12px 24px

**Reference apps:**
- Segment (data tool clarity and information density)
- Linear (clean action-oriented UI, no fluff)
- Metabase (dashboard layout for the report screen)

---

## Implementation Notes

**Tech stack:**
- Frontend: React + TypeScript (Lovable or Cursor)
- Styling: Tailwind CSS
- Backend / API: Supabase Edge Functions
- Database: Supabase (job metadata only — no source data persisted)
- AI API: Anthropic Claude claude-sonnet-4-20250514 (generation + compliance scoring)
- File handling: Client-side CSV parsing (Papa Parse); files never written to server storage

**Data handling:**
Source data uploaded by users is processed in-memory only and is never written to the database or stored beyond the active session. Only job metadata is persisted (job ID, prompt, row count, scores, status). Generated output CSVs are held temporarily for download and purged after 24 hours. PHI scan runs client-side before any data leaves the browser.

**PHI scanning:**
Run a regex + pattern-matching scan client-side against the 18 HIPAA identifier patterns before upload confirmation. Flag any column whose values match SSN patterns (XXX-XX-XXXX), 10-digit phone patterns, email patterns, or name patterns. Block upload if any pattern is detected with >10% column hit rate to avoid false positives on code fields.

**HCPCS validation:**
Maintain a lookup of valid HCPCS code ranges by specialty embedded in the system prompt and validated post-generation. Any generated code outside the valid range for the requested specialty is flagged and regenerated.

---

*PLANNING.md — Cynthia v1.0*
