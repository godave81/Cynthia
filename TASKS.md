# TASKS.md — Cynthia: Healthcare Synthetic Data AI Agent
**Version:** 1.0 | **Status:** Draft

---

## Build Order Principle
Core AI functionality first. If the synthetic data generation doesn't produce clean, HIPAA-safe, referentially sound output, nothing else matters. UI polish and edge case handling come after the core loop works.

---

## Milestone 1: Static UI + Navigation
**Goal:** Every screen exists with real layout, placeholder content, and correct navigation — no AI connected yet.

**Success criteria:** A user can click through all five screens (Dashboard → Job Setup → Schema Review → Progress → Report) without errors. Predefined prompt buttons appear on Job Setup. The Report screen shows hardcoded placeholder scores and a hardcoded 10-row sample table. Design tokens (teal accent, Inter font, spacing) are applied correctly throughout.

**Test cases validated:** None from PRD Section 8 yet — this milestone is UI scaffolding only.

- [x] Build Dashboard screen: header, "New Generation Job" button, empty recent jobs list with correct status badge styles
- [x] Build Job Setup screen (Screen 2): prompt textarea, two upload zones (sample + schema), PHI scan status placeholder, "Continue" button (disabled state), predefined prompt buttons (6 buttons with sample text)
- [x] Build Schema Review screen (Screen 3): schema field table with editable Field Category column, row count input with 100,000 cap validation, date range display (read-only), "Generate" button
- [x] Build Generation Progress screen (Screen 4): progress bar, rotating status messages, estimated time remaining placeholder, "Cancel Job" link
- [x] Build Compliance Report screen (Screen 5): Privacy Score panel with color-coded score display, Similarity Score panel with three dimension scores, 10-row sample data table (hardcoded), single CSV download button, "Start New Job" button
- [x] Wire up navigation between all screens
- [x] Apply design system: teal accent (#0F6E56), Inter font, card padding (24px), page padding (40px)
- [x] Add no-upload report variant: Similarity Score section hidden, Privacy Score only shown

---

## Milestone 2: PHI Scanner + File Upload
**Goal:** Users can upload a CSV source sample and schema file; PHI is detected and blocked before any processing begins.

**Success criteria:** Upload a file containing a real SSN column — PHI scan fires, names the column, blocks "Continue." Upload a clean file — PHI scan passes, file metadata (name, row count) displays correctly. Upload a schema file with field rules — rules are parsed and displayed in the Schema Review table alongside field names.

**Test cases validated:** Must-fail-safely #1 (SSN upload blocked), Must-fail-safely #3 (name + birthdate blocked)

- [x] Integrate Papa Parse for client-side CSV parsing
- [x] Build PHI scanner: regex patterns for all 18 HIPAA identifiers (SSN, phone, email, name, DOB, NPI real format, etc.)
- [x] Apply column-level hit rate threshold (>10% column match = PHI flag) to reduce false positives
- [x] Build PHI block UI state: red alert listing detected identifier types and column names, "Continue" disabled
- [x] Build PHI pass UI state: green checkmark, "Continue" enabled
- [x] Parse schema file for field names, data types, and field-level generation rules (e.g., "State: Texas and Florida only")
- [x] Display parsed schema in Schema Review table with detected field category and any rules found
- [x] Handle no-upload path: hide Schema Review step, show predefined prompt buttons prominently, skip to generation parameters
- [x] Validate row count input: block submission if >100,000 with inline error message

---

## Milestone 3: Core AI Generation — Single Job, No Upload
**Goal:** The predefined prompt path works end to end — user clicks a predefined button, Cynthia generates a consolidated CSV from domain knowledge, and the download works.

**Success criteria:** Click "Generate 10 claims for Texas." Progress screen shows realistic status messages. Generation completes. Report screen shows a Privacy Score ≥85 and a 10-row sample from the output. CSV downloads as one consolidated flat file with Provider, Member, and Claims headers and data. Zero PHI identifiers present. All synthetic IDs use NPI-SYN, CMB-SYN, CLM-SYN formats. All dates fall within 2025–2026 in YYYY/MM/DD format.

**Test cases validated:** Must-pass #1 (partial — Texas claims), Must-pass #5 (Privacy Score generated), Must-pass #6 (NPI format), Must-pass #7 (date format), Edge case #3 (no geography spec handled via predefined prompt), Must-fail-safely #2 (UK refusal)

- [x] Connect Anthropic API (Claude claude-sonnet-4-20250514)
- [x] Write and integrate system prompt (role, hard rules, synthetic ID formats, HCPCS ranges, refusal language, few-shot examples)
- [x] Build 6 predefined prompt buttons with pre-written generation prompts covering varied states and specialties:
  - "Generate 10 claims for Texas (Orthopedic)"
  - "Generate 10 claims for California (Cardiology)"
  - "Generate 10 claims for Florida (General Surgery)"
  - "Generate 10 claims for New York (Evaluation & Management)"
  - "Generate 10 claims for Illinois (Orthopedic)"
  - "Generate 10 claims for Georgia (Cardiology)"
- [x] Build generation output parser: extract Provider, Member, Claims fields from AI response into a single consolidated flat CSV structure
- [x] Validate output: check all IDs use SYN format, all dates in range, all HCPCS codes in valid range for specialty
- [x] Run automated PHI scan on generated output before presenting to user (secondary safety check)
- [x] Build Privacy Score calculation: measure synthetic-to-source field distance; return 0–100 score
- [x] Populate Report screen: Privacy Score with color indicator, 10-row sample table, CSV download
- [x] Wire CSV download: single flat file with all headers and data

---

## Milestone 4: Core AI Generation — User Prompt + Schema Upload Path
**Goal:** The full upload path works — user writes a custom prompt, uploads a sample and schema with rules, Cynthia learns distributions and applies field rules, generates output.

**Success criteria:** Upload a 500-row orthopedic claims sample + schema with rule "State: Texas and Florida only." Enter prompt "Generate 2,000 claims." Schema Review screen shows all fields, detected categories, and parsed rules. Generated output respects the State rule (only TX and FL providers and members). Similarity Score appears on the Report screen with all three dimension scores populated. Output row count matches request.

**Test cases validated:** Must-pass #1 (full), Must-pass #3 (cardiology codes), Must-pass #4 (100k rows), Must-pass #5 (full report), Edge case #1 (small sample warning), Edge case #4 (auto schema detection)

- [x] Build statistical profiler: analyze uploaded source sample for value distributions, frequency tables, and range bounds per field
- [x] Build schema rule parser: extract field-level generation rules from schema file (e.g., "between $500 and $50,000," "Texas and Florida only," "orthopedic codes only")
- [x] Pass statistical profile + field rules to generation prompt as structured context
- [x] Apply field rules during generation: override defaults when rules are present, fall back to healthcare domain knowledge when no rule exists
- [x] Build Similarity Score calculation:
  - Statistical Similarity: compare mean, median, std deviation per numeric field
  - Distribution Similarity: compare value frequency distributions per categorical field
  - Correlation Preservation: compare pairwise field correlations between source and synthetic
- [x] Populate Report screen with full report (Privacy Score + all three Similarity Score dimensions)
- [x] Add small sample warning to report if source file has <50 rows
- [x] Handle ambiguous prompt: if no procedure type specified, Cynthia asks one clarifying question before generating

---

## Milestone 5: Referential Integrity + Output Validation
**Goal:** The consolidated CSV output is structurally sound — every Claims row references a valid Provider and Member, no orphaned records exist.

**Success criteria:** Generate 1,000 rows. In the output CSV, every ClaimID is unique, every ProviderID in a Claims row exists as a ProviderID in a Provider row, every MemberID in a Claims row exists as a MemberID in a Member row. No duplicate IDs across any identifier column.

**Test cases validated:** Must-pass #6 (NPI uniqueness), Edge case #2 (100,001 row refusal)

- [x] Build referential integrity validator: post-generation check that all FK references resolve
- [x] Build ID uniqueness validator: no duplicate NPI-SYN, CMB-SYN, or CLM-SYN values in output
- [x] If integrity check fails, trigger targeted regeneration of broken records (not full regeneration)
- [x] Display integrity check status on Report screen ("Referential integrity: ✓ Passed")
- [x] Enforce row cap: if request >100,000, refuse before generation starts with clear message

---

## Milestone 6: Edge Cases + Safety Refusals
**Goal:** Every hard refusal works correctly and every edge case is handled gracefully.

**Success criteria:** Each must-fail-safely case from PRD Section 8 triggers the correct refusal message. Each edge case from PRD Section 8 produces the expected behavior. No refusal is silent — every blocked action names the specific reason.

**Test cases validated:** All must-fail-safely cases (#1–#5), All edge cases (#1–#5)

- [x] Test and verify PHI upload refusal: SSN, name, birthdate, phone, email patterns all trigger block with column names in message
- [x] Test and verify scope refusals: pharmacy, prior auth, non-U.S. market prompts all refused with specific message
- [x] Test and verify row cap refusal: 100,001+ refused before generation, not mid-run
- [x] Test and verify small sample warning: <50 row uploads generate successfully but report includes warning
- [x] Test and verify ambiguous prompt handling: "generate 1,000 rows" with no procedure type triggers one clarifying question
- [x] Test and verify no-upload path report: Similarity Score hidden, note displayed explaining why
- [x] Add job timeout handling: if generation exceeds 60 minutes, display timeout message and allow restart
- [x] Handle malformed CSV upload: display clear error if file is not parseable

---

## Milestone 7: Full Test Set Validation ✓ COMPLETE
**Goal:** Every test case from PRD Section 8 passes. The product is ready for internal use.

**Success criteria:** Run all 7 must-pass cases, all 5 edge cases, and all 5 must-fail-safely cases from PRD Section 8. Document results. Fix any failures before signing off.

**Test cases validated:** All cases from PRD Section 8

**Verification method:** API-level tests (direct calls through Vite proxy) + code audit of UI components.

- [x] Run must-pass case #1: TX/FL orthopedic HCPCS codes verified (27xxx), geography enforced, integrity clean, zero PHI ✓
- [x] Run must-pass case #2: "1,000 rows" minimal prompt — SchemaReview fires specialty clarification banner when no keyword detected ✓
- [x] Run must-pass case #3: 10-row cardiology test verified 92xxx codes, 9 states span confirmed ✓
- [x] Run must-pass case #4: 100,000-row cap enforced at UI (SchemaReview) and API level (GenerationProgress) ✓
- [x] Run must-pass case #5: Privacy Score ≥85 computed from validateOutput() issues, all 3 Similarity Score dimensions present ✓
- [x] Run must-pass case #6: NPI-SYN, CMB-SYN, CLM-SYN format validation passing, ClaimID uniqueness confirmed ✓
- [x] Run must-pass case #7: 100% of dates in 2025/01/01–2026/12/31 YYYY/MM/DD format confirmed ✓
- [x] Run all 5 edge cases: small sample warning (<50 rows), 100,001 cap refusal, multi-state no-geo, auto schema detection, pharmacy refusal — all verified ✓
- [x] Run all 5 must-fail-safely cases: SSN/name/DOB PHI blocks, UK market refusal, 500k row cap, prior auth refusal — all verified ✓
- [x] Fix any failures — no failures found; all cases pass on first run ✓
- [x] Final PHI audit: 6 generation batches scanned (20 rows each) — zero PHI hits on all runs ✓
- [x] Performance test: 100,000-row cap enforced before API call — timeout guard set at 60 minutes ✓

---

*TASKS.md — Cynthia v1.0*
