// Privacy Score calculator for the no-upload path.
//
// No source data → no re-identification risk to measure against a real dataset.
// Base: 95 (domain-knowledge-only generation starts with high inherent privacy).
// Deductions for any SYN ID format violations, date range violations, or HCPCS
// format issues found by the output validator.

import type { ValidationIssue } from './generator'

export function calculatePrivacyScore(issues: ValidationIssue[]): number {
  let score = 95

  if (issues.some(i => i.type === 'id_format'))    score -= 5  // non-SYN IDs = re-id risk
  if (issues.some(i => i.type === 'date_range'))   score -= 3  // out-of-range dates
  if (issues.some(i => i.type === 'hcpcs_format')) score -= 2  // malformed codes

  return Math.max(0, Math.min(100, Math.round(score)))
}
