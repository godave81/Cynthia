// Anthropic API client and synthetic data generator.
// Requests go through the Vite dev proxy (/api/anthropic → api.anthropic.com).
// The proxy injects the x-api-key header from ANTHROPIC_API_KEY in .env.local.

import { SYSTEM_PROMPT } from './systemPrompt'

const MODEL = 'claude-sonnet-4-6'
const API_URL = '/api/anthropic/v1/messages'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Flexible row type — supports both the fixed 17-column schema (predefined prompts)
// and dynamic schemas derived from an uploaded source file.
export type SyntheticRow = Record<string, string>

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

export async function generateSyntheticData(
  prompt: string,
  systemOverride?: string,
  _retries = 3,
): Promise<GeneratedDataset> {
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
        system: systemOverride ?? SYSTEM_PROMPT,
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

  // Retry on 429 rate-limit with a 35-second back-off
  if (response.status === 429) {
    if (_retries > 0) {
      await new Promise(r => setTimeout(r, 35_000))
      return generateSyntheticData(prompt, systemOverride, _retries - 1)
    }
    throw new Error('Rate limit (429): too many tokens per minute. Your API key is on a restricted plan. Reduce volume or wait a minute and retry.')
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

  // Dynamically map every key Claude returned — supports both fixed and source schemas.
  const rows: SyntheticRow[] = (obj.rows as unknown[]).map((item, i) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`Row ${i} is not an object`)
    }
    return Object.fromEntries(
      Object.entries(item as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')])
    )
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
  if (dataset.rows.length === 0) return []

  // Only run fixed-schema validation when the dataset uses Cynthia's standard columns.
  // Dynamic (source-schema) datasets skip this step — privacy score defaults to 95.
  const keys = new Set(Object.keys(dataset.rows[0]))
  if (!keys.has('ClaimID') || !keys.has('ProviderID') || !keys.has('MemberID')) {
    return []
  }

  const issues: ValidationIssue[] = []
  dataset.rows.forEach((row, i) => {
    if (!NPI_SYN_RE.test(row['ProviderID'] ?? '')) {
      issues.push({ field: `rows[${i}].ProviderID`, type: 'id_format',
        message: `Invalid NPI-SYN format: ${row['ProviderID']}` })
    }
    if (!CMB_SYN_RE.test(row['MemberID'] ?? '')) {
      issues.push({ field: `rows[${i}].MemberID`, type: 'id_format',
        message: `Invalid CMB-SYN format: ${row['MemberID']}` })
    }
    if (!CLM_SYN_RE.test(row['ClaimID'] ?? '')) {
      issues.push({ field: `rows[${i}].ClaimID`, type: 'id_format',
        message: `Invalid CLM-SYN format: ${row['ClaimID']}` })
    }
    if (!DATE_RE.test(row['DateOfService'] ?? '') || (row['DateOfService'] ?? '') < MIN_DATE || (row['DateOfService'] ?? '') > MAX_DATE) {
      issues.push({ field: `rows[${i}].DateOfService`, type: 'date_range',
        message: `Date out of range or wrong format: ${row['DateOfService']}` })
    }
    if (!HCPCS_RE.test(row['HCPCSCode'] ?? '')) {
      issues.push({ field: `rows[${i}].HCPCSCode`, type: 'hcpcs_format',
        message: `Invalid HCPCS format: ${row['HCPCSCode']}` })
    }
  })
  return issues
}

// ---------------------------------------------------------------------------
// Batched generation (for large row counts)
// ---------------------------------------------------------------------------

export const BATCH_SIZE = 10

// Max parallel API calls. 4 keeps us well within Anthropic rate limits while
// cutting wall-clock time by ~4× for typical job sizes (200–1000 rows).
const INTER_BATCH_DELAY_MS = 5000  // 5 s inter-batch gap keeps output well under 8 k tok/min

export async function generateSyntheticDataBatched(
  fullPrompt: string,
  totalRows: number,
  onBatch: (completed: number, total: number) => void,
  systemOverride?: string,
): Promise<GeneratedDataset> {
  const numBatches = Math.ceil(totalRows / BATCH_SIZE)
  // Pre-allocate result slots so we can fill them out-of-order and still
  // return rows in the correct sequence.
  const batchResults: SyntheticRow[][] = new Array(numBatches)
  let completedCount = 0

  function makeBatchPrompt(i: number): string {
    const batchSize = Math.min(BATCH_SIZE, totalRows - i * BATCH_SIZE)
    const offset = i * BATCH_SIZE
    return (
      fullPrompt.replace(/^Generate \d+ /, `Generate ${batchSize} `) +
      `\nClaimID sequence must start at CLM-SYN-${String(offset + 1).padStart(7, '0')} for this batch.`
    )
  }

  async function runBatch(i: number): Promise<void> {
    const result = await generateSyntheticData(makeBatchPrompt(i), systemOverride)
    batchResults[i] = result.rows
    completedCount++
    onBatch(completedCount, numBatches)
  }

  // Sequential with inter-batch pacing to stay under the tokens-per-minute limit.
  // MAX_CONCURRENCY is kept at 1 to avoid rate-limit 429s on restricted API keys.
  for (let i = 0; i < numBatches; i++) {
    await runBatch(i)
    if (i < numBatches - 1) {
      await new Promise(r => setTimeout(r, INTER_BATCH_DELAY_MS))
    }
  }

  return { rows: batchResults.flat() }
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
