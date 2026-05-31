// Post-generation integrity validator for the flat consolidated CSV.
//
// Checks:
//  1. ClaimID uniqueness — no duplicate CLM-SYN IDs
//  2. ProviderID consistency — same ProviderID must carry identical provider fields
//  3. MemberID consistency  — same MemberID must carry identical member fields
//
// fixIntegrityViolations() normalises inconsistent rows to the first-seen profile
// and re-sequences any duplicate ClaimIDs in-memory rather than making a second
// API call (the "targeted fix" step described in TASKS.md §M5).

import type { SyntheticRow } from './generator'

export interface IntegrityViolation {
  type: 'duplicate_claim_id' | 'inconsistent_provider' | 'inconsistent_member'
  ids: string[]
  message: string
}

export interface IntegrityResult {
  passed: boolean
  violations: IntegrityViolation[]
  fixedCount: number  // rows corrected by fixIntegrityViolations()
}

type ProviderProfile = Pick<SyntheticRow,
  'FacilityName' | 'ProviderType' | 'Specialty' | 'ProviderState' | 'ProviderZipCode'>

type MemberProfile = Pick<SyntheticRow,
  'DateOfBirth' | 'Gender' | 'MemberState' | 'MemberZipCode' | 'InsuranceType'>

function providerProfileOf(row: SyntheticRow): ProviderProfile {
  return {
    FacilityName:    row.FacilityName,
    ProviderType:    row.ProviderType,
    Specialty:       row.Specialty,
    ProviderState:   row.ProviderState,
    ProviderZipCode: row.ProviderZipCode,
  }
}

function memberProfileOf(row: SyntheticRow): MemberProfile {
  return {
    DateOfBirth:  row.DateOfBirth,
    Gender:       row.Gender,
    MemberState:  row.MemberState,
    MemberZipCode: row.MemberZipCode,
    InsuranceType: row.InsuranceType,
  }
}

function profilesMatch<T extends object>(a: T, b: T): boolean {
  return (Object.keys(a) as (keyof T)[]).every(k => a[k] === b[k])
}

export function validateIntegrity(rows: SyntheticRow[]): IntegrityResult {
  const violations: IntegrityViolation[] = []

  // 1. ClaimID uniqueness
  const seenClaims = new Map<string, number>()  // id → first index
  const dupClaims: string[] = []
  rows.forEach((row, i) => {
    if (seenClaims.has(row.ClaimID)) {
      if (!dupClaims.includes(row.ClaimID)) dupClaims.push(row.ClaimID)
    } else {
      seenClaims.set(row.ClaimID, i)
    }
  })
  if (dupClaims.length > 0) {
    violations.push({
      type: 'duplicate_claim_id',
      ids: dupClaims,
      message: `${dupClaims.length} duplicate ClaimID(s) detected.`,
    })
  }

  // 2. ProviderID consistency
  const providerCanon = new Map<string, ProviderProfile>()
  const badProviders: string[] = []
  for (const row of rows) {
    const canon = providerCanon.get(row.ProviderID)
    if (!canon) {
      providerCanon.set(row.ProviderID, providerProfileOf(row))
    } else if (!profilesMatch(canon, providerProfileOf(row))) {
      if (!badProviders.includes(row.ProviderID)) badProviders.push(row.ProviderID)
    }
  }
  if (badProviders.length > 0) {
    violations.push({
      type: 'inconsistent_provider',
      ids: badProviders,
      message: `${badProviders.length} ProviderID(s) have inconsistent fields across rows.`,
    })
  }

  // 3. MemberID consistency
  const memberCanon = new Map<string, MemberProfile>()
  const badMembers: string[] = []
  for (const row of rows) {
    const canon = memberCanon.get(row.MemberID)
    if (!canon) {
      memberCanon.set(row.MemberID, memberProfileOf(row))
    } else if (!profilesMatch(canon, memberProfileOf(row))) {
      if (!badMembers.includes(row.MemberID)) badMembers.push(row.MemberID)
    }
  }
  if (badMembers.length > 0) {
    violations.push({
      type: 'inconsistent_member',
      ids: badMembers,
      message: `${badMembers.length} MemberID(s) have inconsistent fields across rows.`,
    })
  }

  return { passed: violations.length === 0, violations, fixedCount: 0 }
}

// Normalises all rows to canonical first-seen profiles and re-sequences any
// duplicate ClaimIDs. Returns a new array; does not mutate input.
export function fixIntegrityViolations(rows: SyntheticRow[]): { rows: SyntheticRow[]; fixedCount: number } {
  // Build canonical profiles from first occurrence of each ID
  const providerCanon = new Map<string, ProviderProfile>()
  const memberCanon   = new Map<string, MemberProfile>()
  for (const row of rows) {
    if (!providerCanon.has(row.ProviderID)) providerCanon.set(row.ProviderID, providerProfileOf(row))
    if (!memberCanon.has(row.MemberID))     memberCanon.set(row.MemberID,   memberProfileOf(row))
  }

  const seenClaims = new Set<string>()
  // Start renumbering above the highest existing CLM-SYN number
  let nextNum = rows.reduce((max, r) => {
    const n = parseInt(r.ClaimID.replace('CLM-SYN-', ''), 10)
    return isNaN(n) ? max : Math.max(max, n)
  }, 0) + 1

  let fixedCount = 0
  const fixed = rows.map(row => {
    const pCanon = providerCanon.get(row.ProviderID)!
    const mCanon = memberCanon.get(row.MemberID)!

    let claimId = row.ClaimID
    if (seenClaims.has(claimId)) {
      claimId = `CLM-SYN-${String(nextNum++).padStart(7, '0')}`
      fixedCount++
    }
    seenClaims.add(claimId)

    const providerMismatch = !profilesMatch(pCanon, providerProfileOf(row))
    const memberMismatch   = !profilesMatch(mCanon, memberProfileOf(row))
    if (providerMismatch || memberMismatch || claimId !== row.ClaimID) fixedCount++

    return { ...row, ...pCanon, ...mCanon, ClaimID: claimId }
  })

  return { rows: fixed, fixedCount }
}
