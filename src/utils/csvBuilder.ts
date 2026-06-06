// Builds the consolidated CSV from a generated dataset.
// Column headers are derived dynamically from the first row's keys,
// so the output schema always matches what was generated (fixed or source-schema).

import type { GeneratedDataset } from './generator'

function escapeField(value: string): string {
  // RFC 4180: wrap in double-quotes if field contains comma, quote, or newline
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function buildConsolidatedCsv(dataset: GeneratedDataset): string {
  if (dataset.rows.length === 0) return ''

  // Use actual column names from the generated data — works for both
  // Cynthia's fixed 17-column schema and any source-schema output.
  const headers = Object.keys(dataset.rows[0])
  const header   = headers.join(',')
  const dataRows = dataset.rows.map(row =>
    headers.map(col => escapeField(row[col] ?? '')).join(',')
  )
  return [header, ...dataRows].join('\n')
}
