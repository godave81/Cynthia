// Schema parser — handles source CSV auto-detection and schema file parsing.
// Schema files may be CSV or JSON and may carry per-field generation rules.

import Papa from 'papaparse'

export interface SchemaField {
  name: string
  type: string
  category: string
  rule?: string
}

// Maps normalised column names → healthcare field categories
const CATEGORY_MAP: Record<string, string> = {
  npi:              'Provider ID (NPI)',
  provider_id:      'Provider ID (NPI)',
  providerid:       'Provider ID (NPI)',
  facility_name:    'Facility Name',
  facilityname:     'Facility Name',
  facility:         'Facility Name',
  member_id:        'Member ID',
  memberid:         'Member ID',
  date_of_service:  'Date of Service',
  dateofservice:    'Date of Service',
  dos:              'Date of Service',
  hcpcs:            'HCPCS Code',
  hcpcs_code:       'HCPCS Code',
  procedure_code:   'HCPCS Code',
  billed_amount:    'Billed Amount',
  billedamount:     'Billed Amount',
  billed:           'Billed Amount',
  claim_id:         'Claim ID',
  claimid:          'Claim ID',
  claim_status:     'Claim Status',
  claimstatus:      'Claim Status',
  status:           'Claim Status',
  state:            'State',
  zip:              'Zip Code',
  zip_code:         'Zip Code',
  zipcode:          'Zip Code',
  gender:           'Gender',
  sex:              'Gender',
  insurance_type:   'Insurance Type',
  insurancetype:    'Insurance Type',
  dob:              'Date of Birth',
  date_of_birth:    'Date of Birth',
}

const DATE_REGEX   = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$|^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/
const DECIMAL_REGEX = /^-?\$?[\d,]+\.\d+$/
const INT_REGEX    = /^-?[\d,]+$/

function detectCategory(name: string): string {
  const key = name.toLowerCase().replace(/[\-\s]/g, '_')
  return CATEGORY_MAP[key] ?? 'Other'
}

function detectType(values: string[]): string {
  const nonEmpty = values.filter(v => v.trim() !== '')
  if (nonEmpty.length === 0) return 'String'
  const all = (fn: (v: string) => boolean) => nonEmpty.every(v => fn(v.trim()))
  if (all(v => DATE_REGEX.test(v)))    return 'Date'
  if (all(v => DECIMAL_REGEX.test(v))) return 'Decimal'
  if (all(v => INT_REGEX.test(v)))     return 'Integer'
  return 'String'
}

// Auto-detect schema from a parsed source CSV
export function parseSourceSchema(
  rows: Record<string, string>[],
  headers: string[],
): SchemaField[] {
  return headers.map(name => ({
    name,
    type: detectType(rows.map(r => r[name] ?? '')),
    category: detectCategory(name),
  }))
}

// Parse an uploaded schema file (CSV or JSON) into SchemaField[]
export async function parseSchemaFile(file: File): Promise<SchemaField[]> {
  const text = await file.text()
  return file.name.toLowerCase().endsWith('.json')
    ? parseJsonSchema(text)
    : parseCsvSchemaText(text)
}

function parseJsonSchema(text: string): SchemaField[] {
  try {
    const raw: unknown = JSON.parse(text)
    const arr: unknown[] = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as { fields?: unknown[] }).fields)
      ? (raw as { fields: unknown[] }).fields
      : Object.entries(raw as Record<string, unknown>).map(([name, val]) =>
          ({ name, ...(typeof val === 'object' && val !== null ? val : {}) })
        )

    return arr.map(item => {
      const f = item as Record<string, string>
      const name = f.name ?? f.field_name ?? ''
      return {
        name,
        type:     f.type ?? f.data_type ?? 'String',
        category: f.category ?? detectCategory(name),
        rule:     f.rule ?? f.generation_rule ?? undefined,
      }
    })
  } catch {
    return []
  }
}

function parseCsvSchemaText(text: string): SchemaField[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  })
  return result.data.map(row => {
    const name = row.field_name ?? row.name ?? row.field ?? ''
    return {
      name,
      type:     row.data_type ?? row.type ?? 'String',
      category: row.category ?? detectCategory(name),
      rule:     row.rule ?? row.generation_rule ?? undefined,
    }
  })
}
