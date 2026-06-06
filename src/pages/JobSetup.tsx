import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Papa from 'papaparse'
import { useJob } from '../context/JobContext'
import { scanForPhi } from '../utils/phiScanner'
import { parseSourceSchema, parseSchemaFile } from '../utils/schemaParser'
import StepIndicator from '../components/StepIndicator'
import UploadZone from '../components/UploadZone'
import type { FlaggedColumn } from '../utils/phiScanner'

const PREDEFINED_PROMPTS = [
  { label: 'Orthopedic — Texas',         prompt: 'Generate 10 orthopedic claims for Texas, 2025-2026' },
  { label: 'Cardiology — California',    prompt: 'Generate 10 cardiology claims for California, 2025-2026' },
  { label: 'General Surgery — Florida',  prompt: 'Generate 10 general surgery claims for Florida, 2025-2026' },
  { label: 'E&M — New York',             prompt: 'Generate 10 evaluation & management claims for New York, 2025-2026' },
  { label: 'Orthopedic — Illinois',      prompt: 'Generate 10 orthopedic claims for Illinois, 2025-2026' },
  { label: 'Cardiology — Georgia',       prompt: 'Generate 10 cardiology claims for Georgia, 2025-2026' },
]

export default function JobSetup() {
  const navigate = useNavigate()
  const { job, updateJob, resetJob } = useJob()
  const [rowCount, setRowCount] = useState<string>(String(job.rowCount || 1000))

  // ── Source CSV upload ──────────────────────────────────────────────────────
  async function handleSourceFile(file: File) {
    updateJob({ phi: { scanning: true, passed: false, flaggedColumns: [] } })

    const text = await file.text()
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      // Strip BOM and whitespace from header names so column-name PHI detection is reliable
      transformHeader: (h: string) => h.trim().replace(/^\uFEFF/, ''),
      // Force all values to strings — prevents .trim() TypeError on numeric columns
      dynamicTyping: false,
    })

    // Use headers from meta; fall back to keys of first row in case meta.fields is undefined
    const headers: string[] =
      (parsed.meta.fields && parsed.meta.fields.length > 0)
        ? parsed.meta.fields
        : Object.keys(parsed.data[0] ?? {})

    const rows = parsed.data

    // Guard: completely unparseable file (binary, wrong format, etc.)
    const fatalErrors = parsed.errors.filter(e => e.type !== 'Delimiter' && rows.length === 0)
    if (fatalErrors.length > 0 || (parsed.errors.length > 0 && rows.length === 0)) {
      updateJob({
        sourceFile: null,
        sourceRows: null,
        sourceHeaders: null,
        phi: {
          scanning: false,
          passed: false,
          flaggedColumns: [{
            name: '(parse error)',
            identifierType: 'File could not be parsed. Ensure it is a valid UTF-8 CSV file with column headers.',
            hitRate: 0,
          }],
        },
      })
      return
    }

    // Guard: file parsed but has no data rows
    if (rows.length === 0) {
      updateJob({
        sourceFile: null,
        sourceRows: null,
        sourceHeaders: null,
        phi: {
          scanning: false,
          passed: false,
          flaggedColumns: [{
            name: '(empty file)',
            identifierType: 'No data rows found. The file appears empty or contains only a header row.',
            hitRate: 0,
          }],
        },
      })
      return
    }

    const phiResult = scanForPhi(rows, headers)
    const sourceFields = phiResult.passed
      ? parseSourceSchema(rows, headers)
      : []

    updateJob({
      sourceFile: { name: file.name, rowCount: rows.length },
      sourceRows: phiResult.passed ? rows : null,
      sourceHeaders: phiResult.passed ? headers : null,
      phi: { scanning: false, ...phiResult },
      // Only update schemaFields from source if no schema file has been uploaded
      schemaFields: job.schemaFile ? job.schemaFields : sourceFields,
    })
  }

  // ── Schema file upload ─────────────────────────────────────────────────────
  async function handleSchemaFile(file: File) {
    const fields = await parseSchemaFile(file)
    updateJob({
      schemaFile: { name: file.name },
      schemaFields: fields,
    })
  }

  // ── Predefined prompt — no upload path ────────────────────────────────────
  function handlePredefined(promptText: string) {
    resetJob()
    updateJob({ prompt: promptText, noUpload: true })
    navigate('/jobs/processing?noUpload=true')
  }

  // ── Continue (upload path) ─────────────────────────────────────────────────
  function handleContinue() {
    const rc = parseInt(rowCount, 10)
    updateJob({ noUpload: false, rowCount: isNaN(rc) ? 1000 : rc })
    navigate('/jobs/processing')
  }

  // ── Continue button state ──────────────────────────────────────────────────
  const hasPrompt = job.prompt.trim().length > 0
  const phiOk = job.sourceFile === null
    ? true                          // nothing uploaded — nothing to block
    : !job.phi.scanning && job.phi.passed
  const rowCountNum = parseInt(rowCount, 10)
  const rowCountOver = !isNaN(rowCountNum) && rowCountNum > 100_000
  const rowCountValid = rowCount.trim() !== '' && !isNaN(rowCountNum) && rowCountNum >= 1 && !rowCountOver
  const canContinue = hasPrompt && phiOk && rowCountValid

  // ── PHI status panel ──────────────────────────────────────────────────────
  function PhiStatus() {
    if (!job.sourceFile) return null

    if (job.phi.scanning) {
      return (
        <div className="mt-3 flex items-center gap-2 text-sm text-secondary">
          <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin flex-shrink-0" />
          <span>Scanning for PHI identifiers…</span>
        </div>
      )
    }

    if (!job.phi.passed) {
      return (
        <div className="mt-3 rounded-lg border border-error bg-red-50 p-4">
          <p className="text-sm font-medium text-error mb-2">PHI Detected — Upload Blocked</p>
          <ul className="space-y-1">
            {job.phi.flaggedColumns.map((col: FlaggedColumn) => (
              <li key={col.name} className="text-xs text-error">
                <span className="font-mono font-semibold">'{col.name}'</span>
                {' '}— {col.identifierType}
              </li>
            ))}
          </ul>
          <p className="text-xs text-secondary mt-3">
            Remove or de-identify the flagged fields and re-upload to proceed.
          </p>
        </div>
      )
    }

    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-success">
        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span>
          No PHI detected in {job.sourceFile.name} ({job.sourceFile.rowCount.toLocaleString()} rows). Ready to continue.
        </span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-border">
        <div className="max-w-3xl mx-auto px-10 py-5 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 text-secondary hover:text-primary transition-colors text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
          <span className="text-border">|</span>
          <span className="text-sm font-semibold text-primary">New Generation Job</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-10 py-8">
        <StepIndicator step={1} total={2} label="Describe & Upload" />

        <h1 className="text-2xl font-semibold text-primary mb-2">Describe What You Need</h1>
        <p className="text-sm text-secondary mb-8">
          Write a natural language prompt, or click a predefined option below. Uploading a source sample and schema is optional but improves output quality.
        </p>

        {/* Prompt */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-primary mb-2">Generation Prompt</label>
          <textarea
            value={job.prompt}
            onChange={e => updateJob({ prompt: e.target.value })}
            placeholder="Describe what you need — procedure type, geography, number of records, date range (e.g., 10,000 orthopedic claims in Texas and Florida, 2025–2026)"
            rows={4}
            className="w-full border border-border rounded-lg px-4 py-3 text-sm text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
          />
          <p className="text-xs text-secondary mt-1 text-right">{job.prompt.length} characters</p>
        </div>


        {/* Row count */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-primary mb-2">Records to Generate</label>
          <input
            type="number"
            value={rowCount}
            onChange={e => setRowCount(e.target.value)}
            min={1}
            max={100000}
            className={[
              'w-48 border rounded-lg px-4 py-2.5 text-sm text-primary focus:outline-none focus:ring-2 focus:border-transparent',
              rowCountOver ? 'border-error focus:ring-error' : 'border-border focus:ring-accent',
            ].join(' ')}
          />
          {rowCountOver && (
            <p className="text-xs text-error mt-1.5">Maximum is 100,000 records.</p>
          )}
          <p className="text-xs text-secondary mt-1">Max 100,000 · Large volumes will generate in batches</p>
        </div>

        {/* Predefined prompts */}
        <div className="mb-8">
          <p className="text-xs font-medium text-secondary uppercase tracking-wide mb-3">
            Quick Start — No Upload Needed
          </p>
          <div className="grid grid-cols-2 gap-3">
            {PREDEFINED_PROMPTS.map(p => (
              <button
                key={p.label}
                onClick={() => handlePredefined(p.prompt)}
                className="text-left border border-border rounded-lg px-4 py-3 text-sm text-primary hover:border-accent hover:bg-accent/5 transition-colors"
              >
                <span className="font-medium">{p.label}</span>
                <span className="block text-xs text-secondary mt-0.5">10 records · from domain knowledge</span>
              </button>
            ))}
          </div>
        </div>

        {/* Uploads */}
        <div className="mb-8">
          <p className="text-xs font-medium text-secondary uppercase tracking-wide mb-3">
            Optional — Upload Source Sample & Schema
          </p>
          <div className="grid grid-cols-2 gap-4">
            <UploadZone
              label="Source Sample CSV"
              hint="Max 5,000 rows"
              accept=".csv"
              fileName={job.sourceFile?.name}
              onFile={handleSourceFile}
            />
            <UploadZone
              label="Schema File"
              hint="CSV or JSON with field definitions"
              accept=".csv,.json"
              fileName={job.schemaFile?.name}
              onFile={handleSchemaFile}
            />
          </div>
          <PhiStatus />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Link to="/" className="text-sm text-secondary hover:text-primary transition-colors">
            Cancel
          </Link>
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className={[
              'px-6 py-2.5 rounded-lg text-sm font-medium transition-colors',
              canContinue
                ? 'bg-accent hover:bg-accent-hover text-white'
                : 'bg-border text-secondary cursor-not-allowed',
            ].join(' ')}
          >
            Continue
          </button>
        </div>
      </main>
    </div>
  )
}
