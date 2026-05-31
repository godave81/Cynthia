// PHI scanner — checks CSV columns against the 18 HIPAA Safe Harbour identifier categories.
// Blocks upload if:
//  • the column NAME matches a known PHI field name (immediate flag, no threshold), OR
//  • >10% of values in a column match a PHI value-level regex pattern.
//
// Defensive guarantees:
//  • Handles BOM characters, leading/trailing whitespace, camelCase, and mixed separators
//  • Returns passed:false when headers are empty or the CSV appears malformed

export interface FlaggedColumn {
  name: string
  identifierType: string
  hitRate: number
}

export interface PhiScanResult {
  passed: boolean
  flaggedColumns: FlaggedColumn[]
}

// ---------------------------------------------------------------------------
// Value-level regex patterns — only for identifiers with reliable formats
// ---------------------------------------------------------------------------
const VALUE_PATTERNS: Array<{ type: string; regex: RegExp }> = [
  // SSN: 123-45-6789 or 123456789 (without dashes)
  { type: 'Social Security Number', regex: /^\d{3}-?\d{2}-?\d{4}$/ },
  { type: 'Phone Number',           regex: /^(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/ },
  { type: 'Email Address',          regex: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ },
  { type: 'IP Address',             regex: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/ },
  { type: 'Web URL',                regex: /^https?:\/\/.+/ },
  { type: 'VIN',                    regex: /^[A-HJ-NPR-Z0-9]{17}$/i },
]

// ---------------------------------------------------------------------------
// Column-name heuristics — identifiers that can't be reliably detected from
// value patterns alone (names, addresses, medical record numbers, etc.)
// Keys are in normalised form: lowercase, non-alphanumeric runs → single '_'
// ---------------------------------------------------------------------------
const COLUMN_NAME_PHI: Record<string, string> = {
  // Full Name
  name:                          'Full Name',
  first_name:                    'Full Name',
  firstname:                     'Full Name',
  last_name:                     'Full Name',
  lastname:                      'Full Name',
  patient_name:                  'Full Name',
  patientname:                   'Full Name',
  member_name:                   'Full Name',
  membername:                    'Full Name',
  full_name:                     'Full Name',
  fullname:                      'Full Name',
  // Date of Birth
  dob:                           'Date of Birth',
  date_of_birth:                 'Date of Birth',
  dateofbirth:                   'Date of Birth',
  birth_date:                    'Date of Birth',
  birthdate:                     'Date of Birth',
  birthday:                      'Date of Birth',
  patient_dob:                   'Date of Birth',
  patientdob:                    'Date of Birth',
  member_dob:                    'Date of Birth',
  memberdob:                     'Date of Birth',
  // Social Security Number
  ssn:                           'Social Security Number',
  social_security:               'Social Security Number',
  social_security_number:        'Social Security Number',
  socialsecuritynumber:          'Social Security Number',
  // Phone / Fax
  phone:                         'Phone Number',
  phone_number:                  'Phone Number',
  phonenumber:                   'Phone Number',
  telephone:                     'Phone Number',
  mobile:                        'Phone Number',
  cell:                          'Phone Number',
  cell_phone:                    'Phone Number',
  fax:                           'Fax Number',
  fax_number:                    'Fax Number',
  faxnumber:                     'Fax Number',
  // Email
  email:                         'Email Address',
  email_address:                 'Email Address',
  emailaddress:                  'Email Address',
  // Medical / Health IDs
  mrn:                           'Medical Record Number',
  medical_record:                'Medical Record Number',
  medical_record_number:         'Medical Record Number',
  medicalrecordnumber:           'Medical Record Number',
  account_number:                'Account Number',
  accountnumber:                 'Account Number',
  beneficiary:                   'Health Plan Beneficiary Number',
  beneficiary_number:            'Health Plan Beneficiary Number',
  beneficiarynumber:             'Health Plan Beneficiary Number',
  // Geographic
  address:                       'Geographic Data',
  street:                        'Geographic Data',
  street_address:                'Geographic Data',
  streetaddress:                 'Geographic Data',
  home_address:                  'Geographic Data',
  homeaddress:                   'Geographic Data',
  // Device / Biometric
  device_id:                     'Device Identifier',
  deviceid:                      'Device Identifier',
  serial_number:                 'Device Identifier',
  serialnumber:                  'Device Identifier',
  fingerprint:                   'Biometric Identifier',
  biometric:                     'Biometric Identifier',
  // IP / URL
  ip:                            'IP Address',
  ip_address:                    'IP Address',
  ipaddress:                     'IP Address',
  url:                           'Web URL',
  website:                       'Web URL',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalise a column name to a canonical key for COLUMN_NAME_PHI lookup.
 *   1. Strip UTF-8 BOM (common in Excel-exported CSVs)
 *   2. Trim surrounding whitespace
 *   3. Lowercase
 *   4. Collapse any run of non-alphanumeric characters to a single underscore
 *   5. Strip leading/trailing underscores
 */
function normalizeColName(raw: string): string {
  return raw
    .replace(/^﻿/, '')           // strip BOM
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')     // non-alphanumeric run → '_'
    .replace(/^_+|_+$/g, '')         // trim edge underscores
}

/**
 * Return the PHI identifier type for a column name, or null if not PHI.
 * Tries three forms:
 *   1. Normalised with underscores  (e.g. "member_name")
 *   2. Fully collapsed (no underscores)  (e.g. "membername")
 *   3. Any dictionary entry whose collapsed form matches the collapsed input
 *      (handles camelCase variations not explicitly listed)
 */
function columnNameMatch(colName: string): string | null {
  const normalized = normalizeColName(colName)      // e.g. "date_of_birth"
  const collapsed  = normalized.replace(/_/g, '')   // e.g. "dateofbirth"

  // Direct lookup (covers most entries in the dictionary)
  if (COLUMN_NAME_PHI[normalized]) return COLUMN_NAME_PHI[normalized]

  // Collapsed lookup (catches camelCase or no-separator variants)
  if (COLUMN_NAME_PHI[collapsed]) return COLUMN_NAME_PHI[collapsed]

  // Dictionary-side collapsed comparison
  // (handles camelCase inputs that collapse to match a dict key's collapsed form)
  for (const [key, value] of Object.entries(COLUMN_NAME_PHI)) {
    if (key.replace(/_/g, '') === collapsed) return value
  }

  return null
}

function hitRate(values: string[], test: (v: string) => boolean): number {
  if (values.length === 0) return 0
  const hits = values.filter(v => test(v.trim())).length
  return hits / values.length
}

// Two-word title-case name pattern: "Maria Johnson", "John Smith"
const NAME_VALUE_REGEX = /^[A-Z][a-z]+\s[A-Z][a-z]+/

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export function scanForPhi(
  rows: Record<string, string>[],
  headers: string[],
): PhiScanResult {
  const THRESHOLD = 0.10

  // Guard: if we can't determine headers we cannot certify the file is PHI-free
  if (headers.length === 0) {
    return {
      passed: false,
      flaggedColumns: [{
        name: '(parse error)',
        identifierType: 'Could not read column headers — check that the file is a plain CSV',
        hitRate: 0,
      }],
    }
  }

  // Guard: single column whose name contains commas → rows are probably quoted-wrapped
  if (headers.length === 1 && headers[0].includes(',')) {
    return {
      passed: false,
      flaggedColumns: [{
        name: headers[0].slice(0, 40),
        identifierType: 'File appears malformed — each row may be wrapped in extra quotes',
        hitRate: 0,
      }],
    }
  }

  const flaggedColumns: FlaggedColumn[] = []

  for (const header of headers) {
    const nonEmpty = rows
      .map(r => (r[header] ?? '').toString())
      .filter(v => v.trim() !== '')

    // 1. Column name heuristic — immediate flag, no threshold needed
    const nameHit = columnNameMatch(header)
    if (nameHit) {
      flaggedColumns.push({ name: header, identifierType: nameHit, hitRate: 1.0 })
      continue
    }

    // 2. Value-level regex patterns
    let flagged = false
    for (const { type, regex } of VALUE_PATTERNS) {
      const rate = hitRate(nonEmpty, v => regex.test(v))
      if (rate > THRESHOLD) {
        flaggedColumns.push({ name: header, identifierType: type, hitRate: rate })
        flagged = true
        break
      }
    }
    if (flagged) continue

    // 3. Name-value pattern: two-word title-case strings
    const nameRate = hitRate(nonEmpty, v => NAME_VALUE_REGEX.test(v))
    if (nameRate > THRESHOLD) {
      flaggedColumns.push({ name: header, identifierType: 'Full Name', hitRate: nameRate })
    }
  }

  return { passed: flaggedColumns.length === 0, flaggedColumns }
}
