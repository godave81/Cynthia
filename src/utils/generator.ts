// Anthropic API client and synthetic data generator.
// Requests go through the Vite dev proxy (/api/anthropic → api.anthropic.com).
// The proxy injects the x-api-key header from ANTHROPIC_API_KEY in .env.local.

import { SYSTEM_PROMPT } from './systemPrompt'

const MODEL = 'claude-sonnet-4-6'
const API_URL = '/api/anthropic/v1/messages'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyntheticRow {
  ClaimID: string
  ProviderID: string
  FacilityName: string
  ProviderType: string
  Specialty: string
  ProviderState: string
  ProviderZipCode: string
  MemberID: string
  DateOfBirth: string
  Gender: string
  MemberState: string
  MemberZipCode: string
  InsuranceType: string
  DateOfService: string
  HCPCSCode: string
  BilledAmount: string
  ClaimStatus: string
}

export interface GeneratedDataset {
  rows: SyntheticRow[]
}

export interface ValidationIssue {
  field: string
  type: 'id_format' | 'date_range' | 'hcpcs_format'
  message: string
}

// ---------------------------------------------------------------------------
// API call
// ---------------------------------------------------------------------------

export async function generateSyntheticData(prompt: string): Promise<GeneratedDataset> {
  let response: Response
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `${prompt}\n\nCRITICAL: Respond with ONLY the JSON structure. Do NOT ask any questions. Do NOT add any prose or explanation. Generate immediately.`,
          },
        ],
      }),
    })
  } catch (e) {
    throw new Error(
      `Could not reach the API. Is the dev server running? (${e instanceof Error ? e.message : String(e)})`
    )
  }

  if (response.status === 401) {
    throw new Error('API key rejected by Anthropic. Check that ANTHROPIC_API_KEY in .env.local is set and the dev server was restarted.')
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`API error ${response.status}: ${body.slice(0, 300)}`)
  }

  const result = await response.json() as {
    content: Array<{ type: string; text: string }>
  }

  const text = result.content.find(c => c.type === 'text')?.text ?? ''
  return parseResponse(text, prompt)
}

// ---------------------------------------------------------------------------
// Response parser
// ---------------------------------------------------------------------------

function parseResponse(raw: string, originalPrompt: string): GeneratedDataset {
  // Robustly extract the JSON object regardless of code fences or surrounding text.
  // Strategy: find the first { and last } and parse that slice.
  let text = raw.trim()

  const firstBrace = text.indexOf('{')
  const lastBrace  = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1)
  } else {
    // Fallback: strip code fences the old way
    text = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()
  }

  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    const preview = raw.slice(0, 200)
    throw new Error(
      `Unexpected response — could not parse as JSON. Preview: "${preview}"`
    )
  }

  if (typeof data !== 'object' || data === null) {
    throw new Error('Response is not a JSON object.')
  }

  const obj = data as Record<string, unknown>

  if (obj.error === 'REFUSAL') {
    throw new Error(
      typeof obj.message === 'string' ? obj.message : 'Request refused by generation engine.'
    )
  }

  if (!Array.isArray(obj.rows)) {
    throw new Error(`Response missing "rows" array. Prompt was: "${originalPrompt.slice(0, 100)}"`)
  }

  const rows: SyntheticRow[] = (obj.rows as unknown[]).map((item, i) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`Row ${i} is not an object`)
    }
    const r = item as Record<string, unknown>
    return {
      ClaimID:         String(r.ClaimID         ?? ''),
      ProviderID:      String(r.ProviderID       ?? ''),
      FacilityName:    String(r.FacilityName     ?? ''),
      ProviderType:    String(r.ProviderType     ?? ''),
      Specialty:       String(r.Specialty        ?? ''),
      ProviderState:   String(r.ProviderState    ?? ''),
      ProviderZipCode: String(r.ProviderZipCode  ?? ''),
      MemberID:        String(r.MemberID         ?? ''),
      DateOfBirth:     String(r.DateOfBirth      ?? ''),
      Gender:          String(r.Gender           ?? ''),
      MemberState:     String(r.MemberState      ?? ''),
      MemberZipCode:   String(r.MemberZipCode    ?? ''),
      InsuranceType:   String(r.InsuranceType    ?? ''),
      DateOfService:   String(r.DateOfService    ?? ''),
      HCPCSCode:       String(r.HCPCSCode        ?? ''),
      BilledAmount:    String(r.BilledAmount      ?? ''),
      ClaimStatus:     String(r.ClaimStatus      ?? ''),
    }
  })

  return { rows }
}

// ---------------------------------------------------------------------------
// Output validator
// ---------------------------------------------------------------------------

const NPI_SYN_RE  = /^NPI-SYN-\d+$/
const CMB_SYN_RE  = /^CMB-SYN-\d+$/
const CLM_SYN_RE  = /^CLM-SYN-\d+$/
const DATE_RE     = /^\d{4}\/\d{2}\/\d{2}$/
const HCPCS_RE    = /^\d{5}$|^[A-Z]\d{4}$/
const MIN_DATE    = '2025/01/01'
const MAX_DATE    = '2026/12/31'

export function validateOutput(dataset: GeneratedDataset): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  dataset.rows.forEach((row, i) => {
    if (!NPI_SYN_RE.test(row.ProviderID)) {
      issues.push({ field: `rows[${i}].ProviderID`, type: 'id_format',
        message: `Invalid NPI-SYN format: ${row.ProviderID}` })
    }
    if (!CMB_SYN_RE.test(row.MemberID)) {
      issues.push({ field: `rows[${i}].MemberID`, type: 'id_format',
        message: `Invalid CMB-SYN format: ${row.MemberID}` })
    }
    if (!CLM_SYN_RE.test(row.ClaimID)) {
      issues.push({ field: `rows[${i}].ClaimID`, type: 'id_format',
        message: `Invalid CLM-SYN format: ${row.ClaimID}` })
    }
    if (!DATE_RE.test(row.DateOfService) || row.DateOfService < MIN_DATE || row.DateOfService > MAX_DATE) {
      issues.push({ field: `rows[${i}].DateOfService`, type: 'date_range',
        message: `Date out of range or wrong format: ${row.DateOfService}` })
    }
    if (!HCPCS_RE.test(row.HCPCSCode)) {
      issues.push({ field: `rows[${i}].HCPCSCode`, type: 'hcpcs_format',
        message: `Invalid HCPCS format: ${row.HCPCSCode}` })
    }
  })

  return issues
}

// ---------------------------------------------------------------------------
// Batched generation (for large row counts)
// ---------------------------------------------------------------------------

export const BATCH_SIZE = 25

export async function generateSyntheticDataBatched(
  fullPrompt: string,
  totalRows: number,
  onBatch: (completed: number, total: number) => void,
): Promise<GeneratedDataset> {
  const numBatches = Math.ceil(totalRows / BATCH_SIZE)
  const allRows: SyntheticRow[] = []

  for (let i = 0; i < numBatches; i++) {
    const batchSize = Math.min(BATCH_SIZE, totalRows - i * BATCH_SIZE)
    const offset = i * BATCH_SIZE

    // Replace the row count in the prompt with this batch's count, and
    // add a ClaimID offset so IDs are unique across batches.
    const batchPrompt =
      fullPrompt.replace(/^Generate \d+ /, `Generate ${batchSize} `) +
      `\nClaimID sequence must start at CLM-SYN-${String(offset + 1).padStart(7, '0')} for this batch.`

    const result = await generateSyntheticData(batchPrompt)
    allRows.push(...result.rows)
    onBatch(i + 1, numBatches)
  }

  return { rows: allRows }
}

// ---------------------------------------------------------------------------
// Upload-path prompt builder
// ---------------------------------------------------------------------------

import type { DataProfile } from './statisticalProfiler'
import type { SchemaField } from './schemaParser'

export function buildUploadPathPrompt(
  userPrompt: string,
  rowCount: number,
  profile: DataProfile | null,
  schemaFields: SchemaField[],
): string {
  const parts: string[] = [
    `Generate ${rowCount} synthetic medical claims. ${userPrompt}`,
  ]

  if (profile && profile.fields.length > 0) {
    parts.push(
      `\nSOURCE DATA PROFILE (${profile.rowCount} rows — mirror these distributions, do NOT reproduce actual values):`
    )
    for (const field of profile.fields) {
      if (field.kind === 'numeric' && field.numeric) {
        const n = field.numeric
        parts.push(
          `  ${field.name}: range ${n.min.toFixed(2)}-${n.max.toFixed(2)}, mean ${n.mean.toFixed(2)}, std ${n.stdDev.toFixed(2)}`
        )
      } else if (field.kind === 'categorical' && field.categorical) {
        const top = field.categorical.topValues
          .map(tv => `${tv.value} (${(tv.pct * 100).toFixed(0)}%)`)
          .join(', ')
        parts.push(`  ${field.name}: ${top}`)
      }
    }
  }

  const ruledFields = schemaFields.filter(f => f.rule)
  if (ruledFields.length > 0) {
    parts.push('\nSCHEMA FIELD RULES (hard constraints — override all other defaults):')
    for (const f of ruledFields) {
      parts.push(`  ${f.name}: ${f.rule}`)
    }
  }

  parts.push('\nRespond with only the JSON structure. No prose or explanation.')
  return parts.join('\n')
}
