// Post-generation integrity validator.
//
// Standard-schema mode (ClaimID / ProviderID / MemberID present):
//   Full checks: ClaimID uniqueness, ProviderID field consistency, MemberID field consistency.
//
// Dynamic-schema mode (source-derived column names):
//   Lightweight check: duplicate IDs in whatever column looks like a claim ID.

import type { SyntheticRow } from './generator'

export interface IntegrityViolation {
  type: 'duplicate_claim_id' | 'inconsistent_provider' | 'inconsistent_member'
  ids: string[]
  message: string
}

export interface IntegrityResult {
  passed: boolean
  violations: IntegrityViolation[]
  fixedCount: number
}

// ── Schema detection ───────────────────────────────────────────────────────

function isStandardSchema(rows: SyntheticRow[]): boolean {
  if (rows.length === 0) return true
  const keys = new Set(Object.keys(rows[0]))
  return keys.has('ClaimID') && keys.has('ProviderID') && keys.has('MemberID')
}

/** Finds a column that looks like a claim-ID field (case/separator-insensitive). */
function findCol(rows: SyntheticRow[], ...candidates: string[]): string | undefined {
  if (rows.length === 0) return undefined
  const keys = Object.keys(rows[0])
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  return keys.find(k => candidates.includes(norm(k)))
}

// ── Standard-schema profile helpers ───────────────────────────────────────

const PROVIDER_FIELDS = ['FacilityName', 'ProviderType', 'Specialty', 'ProviderState', 'ProviderZipCode'] as const
const MEMBER_FIELDS   = ['DateOfBirth', 'Gender', 'MemberState', 'MemberZipCode', 'InsuranceType'] as const

type ProviderProfile = Record<typeof PROVIDER_FIELDS[number], string>
type MemberProfile   = Record<typeof MEMBER_FIELDS[number], string>

function providerProfileOf(row: SyntheticRow): ProviderProfile {
  return Object.fromEntries(PROVIDER_FIELDS.map(f => [f, row[f] ?? ''])) as ProviderProfile
}
function memberProfileOf(row: SyntheticRow): MemberProfile {
  return Object.fromEntries(MEMBER_FIELDS.map(f => [f, row[f] ?? ''])) as MemberProfile
}
function profilesMatch<T extends object>(a: T, b: T): boolean {
  return (Object.keys(a) as (keyof T)[]).every(k => a[k] === b[k])
}

// ── Validate ───────────────────────────────────────────────────────────────

export function validateIntegrity(rows: SyntheticRow[]): IntegrityResult {
  const violations: IntegrityViolation[] = []

  if (isStandardSchema(rows)) {
    // ── Standard schema: full three-check suite ──────────────────────────

    // 1. ClaimID uniqueness
    const seenClaims = new Map<string, number>()
    const dupClaims: string[] = []
    rows.forEach((row, i) => {
      const id = row['ClaimID'] ?? ''
      if (seenClaims.has(id)) {
        if (!dupClaims.includes(id)) dupClaims.push(id)
      } else {
        seenClaims.set(id, i)
      }
    })
    if (dupClaims.length > 0) {
      violations.push({ type: 'duplicate_claim_id', ids: dupClaims,
        message: `${dupClaims.length} duplicate ClaimID(s) detected.` })
    }

    // 2. ProviderID consistency
    const providerCanon = new Map<string, ProviderProfile>()
    const badProviders: string[] = []
    for (const row of rows) {
      const pid = row['ProviderID'] ?? ''
      const canon = providerCanon.get(pid)
      if (!canon) {
        providerCanon.set(pid, providerProfileOf(row))
      } else if (!profilesMatch(canon, providerProfileOf(row))) {
        if (!badProviders.includes(pid)) badProviders.push(pid)
      }
    }
    if (badProviders.length > 0) {
      violations.push({ type: 'inconsistent_provider', ids: badProviders,
        message: `${badProviders.length} ProviderID(s) have inconsistent fields across rows.` })
    }

    // 3. MemberID consistency
    const memberCanon = new Map<string, MemberProfile>()
    const badMembers: string[] = []
    for (const row of rows) {
      const mid = row['MemberID'] ?? ''
      const canon = memberCanon.get(mid)
      if (!canon) {
        memberCanon.set(mid, memberProfileOf(row))
      } else if (!profilesMatch(canon, memberProfileOf(row))) {
        if (!badMembers.includes(mid)) badMembers.push(mid)
      }
    }
    if (badMembers.length > 0) {
      violations.push({ type: 'inconsistent_member', ids: badMembers,
        message: `${badMembers.length} MemberID(s) have inconsistent fields across rows.` })
    }

  } else {
    // ── Dynamic schema: just check for duplicate IDs ─────────────────────
    const claimCol = findCol(rows, 'claimid', 'claim_id', 'clmid', 'id')
    if (claimCol) {
      const seen = new Map<string, number>()
      const dups: string[] = []
      rows.forEach((row, i) => {
        const id = row[claimCol] ?? ''
        if (!id) return
        if (seen.has(id)) {
          if (!dups.includes(id)) dups.push(id)
        } else {
          seen.set(id, i)
        }
      })
      if (dups.length > 0) {
        violations.push({ type: 'duplicate_claim_id', ids: dups,
          message: `${dups.length} duplicate ${claimCol}(s) detected.` })
      }
    }
  }

  return { passed: violations.length === 0, violations, fixedCount: 0 }
}

// ── Fix ────────────────────────────────────────────────────────────────────

export function fixIntegrityViolations(
  rows: SyntheticRow[],
): { rows: SyntheticRow[]; fixedCount: number } {

  if (!isStandardSchema(rows)) {
    // Dynamic schema: just resequence duplicate IDs in the claim column.
    const claimCol = findCol(rows, 'claimid', 'claim_id', 'clmid', 'id')
    if (!claimCol) return { rows: [...rows], fixedCount: 0 }

    const seen = new Set<string>()
    let seq = 1
    let fixedCount = 0
    const fixed = rows.map(row => {
      const id = row[claimCol] ?? ''
      if (!id || !seen.has(id)) {
        seen.add(id)
        return row
      }
      fixedCount++
      let newId: string
      do { newId = `SYN-${String(seq++).padStart(7, '0')}` } while (seen.has(newId))
      seen.add(newId)
      return { ...row, [claimCol]: newId }
    })
    return { rows: fixed, fixedCount }
  }

  // Standard schema: full fix
  const providerCanon = new Map<string, ProviderProfile>()
  const memberCanon   = new Map<string, MemberProfile>()
  for (const row of rows) {
    const pid = row['ProviderID'] ?? ''
    const mid = row['MemberID']   ?? ''
    if (!providerCanon.has(pid)) providerCanon.set(pid, providerProfileOf(row))
    if (!memberCanon.has(mid))   memberCanon.set(mid,   memberProfileOf(row))
  }

  const seenClaims = new Set<string>()
  let nextNum = rows.reduce((max, r) => {
    const n = parseInt((r['ClaimID'] ?? '').replace('CLM-SYN-', ''), 10)
    return isNaN(n) ? max : Math.max(max, n)
  }, 0) + 1

  let fixedCount = 0
  const fixed = rows.map(row => {
    const pCanon = providerCanon.get(row['ProviderID'] ?? '')!
    const mCanon = memberCanon.get(row['MemberID']     ?? '')!

    let claimId = row['ClaimID'] ?? ''
    if (seenClaims.has(claimId)) {
      claimId = `CLM-SYN-${String(nextNum++).padStart(7, '0')}`
      fixedCount++
    }
    seenClaims.add(claimId)

    const providerMismatch = !profilesMatch(pCanon, providerProfileOf(row))
    const memberMismatch   = !profilesMatch(mCanon, memberProfileOf(row))
    if (providerMismatch || memberMismatch || claimId !== row['ClaimID']) fixedCount++

    return { ...row, ...pCanon, ...mCanon, ClaimID: claimId }
  })

  return { rows: fixed, fixedCount }
}
