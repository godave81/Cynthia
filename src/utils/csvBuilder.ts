// Builds the single consolidated flat CSV from generated dataset.
// Per DECISIONS.md: one file, all Provider + Member + Claims fields per row.

import type { GeneratedDataset, SyntheticRow } from './generator'

const CSV_HEADERS: (keyof SyntheticRow)[] = [
  'ClaimID',
  'ProviderID',
  'FacilityName',
  'ProviderType',
  'Specialty',
  'ProviderState',
  'ProviderZipCode',
  'MemberID',
  'DateOfBirth',
  'Gender',
  'MemberState',
  'MemberZipCode',
  'InsuranceType',
  'DateOfService',
  'HCPCSCode',
  'BilledAmount',
  'ClaimStatus',
]

function escapeField(value: string): string {
  // RFC 4180: wrap in double-quotes if field contains comma, quote, or newline
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function buildConsolidatedCsv(dataset: GeneratedDataset): string {
  const header = CSV_HEADERS.join(',')
  const dataRows = dataset.rows.map(row =>
    CSV_HEADERS.map(col => escapeField(row[col])).join(',')
  )
  return [header, ...dataRows].join('\n')
}
