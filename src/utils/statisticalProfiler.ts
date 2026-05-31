// Profiles a source CSV sample for use in the generation prompt.
// Returns numeric stats and categorical distributions per field.

import type { SchemaField } from './schemaParser'

export interface NumericStats {
  min: number
  max: number
  mean: number
  median: number
  stdDev: number
}

export interface CategoricalDist {
  topValues: Array<{ value: string; pct: number }>
}

export interface FieldProfile {
  name: string
  kind: 'numeric' | 'categorical'
  numeric?: NumericStats
  categorical?: CategoricalDist
}

export interface DataProfile {
  rowCount: number
  fields: FieldProfile[]
}

function parseNum(v: string): number {
  return parseFloat(v.replace(/[$,]/g, ''))
}

function isNumericColumn(values: string[]): boolean {
  const nonEmpty = values.filter(v => v.trim() !== '')
  if (nonEmpty.length === 0) return false
  return nonEmpty.filter(v => !isNaN(parseNum(v))).length / nonEmpty.length >= 0.8
}

function numericStats(values: string[]): NumericStats {
  const nums = values
    .map(v => parseNum(v.trim()))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b)

  const mean = nums.reduce((s, n) => s + n, 0) / nums.length
  const mid = Math.floor(nums.length / 2)
  const median = nums.length % 2 === 0
    ? (nums[mid - 1] + nums[mid]) / 2
    : nums[mid]
  const variance = nums.reduce((s, n) => s + (n - mean) ** 2, 0) / nums.length

  return { min: nums[0], max: nums[nums.length - 1], mean, median, stdDev: Math.sqrt(variance) }
}

function categoricalDist(values: string[]): CategoricalDist {
  const nonEmpty = values.filter(v => v.trim() !== '')
  const freq: Record<string, number> = {}
  for (const v of nonEmpty) freq[v] = (freq[v] ?? 0) + 1
  const total = nonEmpty.length
  const topValues = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([value, count]) => ({ value, pct: count / total }))
  return { topValues }
}

export function profileData(
  rows: Record<string, string>[],
  headers: string[],
): DataProfile {
  const fields: FieldProfile[] = headers.map(name => {
    const values = rows.map(r => (r[name] ?? '').toString())
    if (isNumericColumn(values)) {
      return { name, kind: 'numeric', numeric: numericStats(values) }
    }
    return { name, kind: 'categorical', categorical: categoricalDist(values) }
  })
  return { rowCount: rows.length, fields }
}

// Format the profile into a section for the AI generation prompt.
export function formatProfileForPrompt(
  profile: DataProfile,
  schemaFields: SchemaField[],
): string {
  const lines: string[] = [
    `SOURCE DATA PROFILE (${profile.rowCount} rows — mirror these distributions, do NOT reproduce actual values):`,
  ]

  for (const field of profile.fields) {
    if (field.kind === 'numeric' && field.numeric) {
      const n = field.numeric
      lines.push(
        `  ${field.name}: range ${n.min.toFixed(2)}-${n.max.toFixed(2)}, mean ${n.mean.toFixed(2)}, std ${n.stdDev.toFixed(2)}`
      )
    } else if (field.kind === 'categorical' && field.categorical) {
      const top = field.categorical.topValues
        .map(tv => `${tv.value} (${(tv.pct * 100).toFixed(0)}%)`)
        .join(', ')
      lines.push(`  ${field.name}: ${top}`)
    }
  }

  const ruledFields = schemaFields.filter(f => f.rule)
  if (ruledFields.length > 0) {
    lines.push('')
    lines.push('SCHEMA FIELD RULES (hard constraints — override all other defaults):')
    for (const f of ruledFields) {
      lines.push(`  ${f.name}: ${f.rule}`)
    }
  }

  return lines.join('\n')
}
