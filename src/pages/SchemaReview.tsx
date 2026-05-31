import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useJob } from '../context/JobContext'
import type { SchemaField } from '../context/JobContext'
import StepIndicator from '../components/StepIndicator'

const FIELD_CATEGORIES = [
  'Provider ID (NPI)',
  'Facility Name',
  'Member ID',
  'Date of Service',
  'HCPCS Code',
  'Billed Amount',
  'Claim ID',
  'Claim Status',
  'State',
  'Zip Code',
  'Date of Birth',
  'Gender',
  'Insurance Type',
  'ICD Code',
  'Other',
]

const SPECIALTY_KEYWORDS = [
  'orthopedic', 'ortho', 'cardiology', 'cardiac', 'cardio',
  'surgery', 'surgical', 'evaluation', 'management', 'e&m', 'em ',
  'general', 'musculoskeletal',
]

function hasSpecialty(prompt: string): boolean {
  const lower = prompt.toLowerCase()
  return SPECIALTY_KEYWORDS.some(kw => lower.includes(kw))
}

// Fallback rows shown when no file was uploaded
const PLACEHOLDER_FIELDS: SchemaField[] = [
  { name: 'ProviderID',    type: 'String',  category: 'Provider ID (NPI)' },
  { name: 'FacilityName',  type: 'String',  category: 'Facility Name' },
  { name: 'MemberID',      type: 'String',  category: 'Member ID' },
  { name: 'DateOfService', type: 'Date',    category: 'Date of Service' },
  { name: 'HCPCSCode',     type: 'String',  category: 'HCPCS Code' },
  { name: 'BilledAmount',  type: 'Decimal', category: 'Billed Amount' },
]

export default function SchemaReview() {
  const navigate = useNavigate()
  const { job, updateJob } = useJob()

  const baseFields = job.schemaFields.length > 0 ? job.schemaFields : PLACEHOLDER_FIELDS
  const isPlaceholder = job.schemaFields.length === 0
  const needsSpecialty = !hasSpecialty(job.prompt)

  const [categories, setCategories] = useState<Record<string, string>>(() =>
    Object.fromEntries(baseFields.map(f => [f.name, f.category]))
  )
  const [rowCount, setRowCount] = useState(String(job.rowCount || 1000))
  const [specialtyHint, setSpecialtyHint] = useState('')

  useEffect(() => {
    setCategories(Object.fromEntries(baseFields.map(f => [f.name, f.category])))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.schemaFields])

  const rowCountNum = parseInt(rowCount, 10)
  const overLimit = !isNaN(rowCountNum) && rowCountNum > 100_000
  const canGenerate = rowCount.trim() !== '' && !isNaN(rowCountNum) && rowCountNum >= 1 && !overLimit

  const hasRules = baseFields.some(f => f.rule)

  function handleGenerate() {
    // Build final prompt: append specialty hint if user provided one
    const finalPrompt = specialtyHint.trim()
      ? `${job.prompt}. Procedure type: ${specialtyHint.trim()}`
      : job.prompt

    updateJob({
      noUpload: false,
      rowCount: rowCountNum,
      prompt: finalPrompt,
    })
    navigate('/jobs/processing')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-border">
        <div className="max-w-3xl mx-auto px-10 py-5 flex items-center gap-3">
          <Link to="/jobs/new" className="flex items-center gap-2 text-secondary hover:text-primary transition-colors text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <span className="text-border">|</span>
          <span className="text-sm font-semibold text-primary">Review Schema & Configure</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-10 py-8">
        <StepIndicator step={2} total={3} label="Review & Configure" />

        <h1 className="text-2xl font-semibold text-primary mb-2">Review Schema & Configure</h1>
        <p className="text-sm text-secondary mb-2">
          {isPlaceholder
            ? 'No file uploaded — showing example schema. Upload a source sample on the previous screen for auto-detected fields.'
            : `Detected ${baseFields.length} field${baseFields.length !== 1 ? 's' : ''} from your uploaded file${job.schemaFile ? ' (schema rules applied)' : ''}. Correct any misclassified categories using the dropdown.`
          }
        </p>

        {isPlaceholder && (
          <div className="mb-4 flex items-center gap-2 text-xs text-secondary border border-border rounded-lg px-3 py-2 bg-background">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Placeholder schema — go back and upload files to see your actual fields here.
          </div>
        )}

        {/* Ambiguous prompt clarification */}
        {needsSpecialty && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm font-medium text-warning mb-1">Procedure type not detected</p>
            <p className="text-xs text-secondary mb-3">
              No procedure type was found in your prompt. Cynthia will default to Evaluation & Management (E&M) codes.
              Specify a type below for more accurate HCPCS codes.
            </p>
            <input
              type="text"
              value={specialtyHint}
              onChange={e => setSpecialtyHint(e.target.value)}
              placeholder="e.g., orthopedic, cardiology, general surgery, E&M"
              className="w-full border border-yellow-300 rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent bg-white"
            />
          </div>
        )}

        {/* Schema table */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden mb-8">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wide">Field Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wide">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wide">Category</th>
                {hasRules && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wide">Generation Rule</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {baseFields.map(field => (
                <tr key={field.name} className="hover:bg-background transition-colors">
                  <td className="px-6 py-3 text-sm font-mono text-primary">{field.name}</td>
                  <td className="px-6 py-3 text-sm text-secondary">{field.type}</td>
                  <td className="px-6 py-3">
                    <select
                      value={categories[field.name] ?? field.category}
                      onChange={e => setCategories({ ...categories, [field.name]: e.target.value })}
                      className="text-sm border border-border rounded px-2 py-1 text-primary focus:outline-none focus:ring-1 focus:ring-accent bg-white"
                    >
                      {FIELD_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </td>
                  {hasRules && (
                    <td className="px-6 py-3 text-xs text-secondary italic">
                      {field.rule ?? '—'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Generation parameters */}
        <div className="bg-surface border border-border rounded-xl p-6 mb-8">
          <h2 className="text-base font-semibold text-primary mb-4">Generation Parameters</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">Records to Generate</label>
              <input
                type="number"
                value={rowCount}
                onChange={e => setRowCount(e.target.value)}
                min={1}
                max={100000}
                className={[
                  'w-full border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:border-transparent',
                  overLimit ? 'border-error focus:ring-error' : 'border-border focus:ring-accent',
                ].join(' ')}
              />
              {overLimit && (
                <p className="text-xs text-error mt-1.5">Maximum is 100,000 records. Please reduce your count.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">Date Range</label>
              <div className="border border-border rounded-lg px-3 py-2 text-sm text-secondary bg-background cursor-not-allowed">
                2025-01-01 to 2026-12-31
              </div>
              <p className="text-xs text-secondary mt-1">Fixed for v1</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-medium text-secondary uppercase tracking-wide mb-2">Output Tables</p>
            <div className="flex gap-6">
              {['Provider', 'Member', 'Claims'].map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-primary">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Link to="/jobs/new" className="text-sm text-secondary hover:text-primary transition-colors">Back</Link>
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className={[
              'px-6 py-2.5 rounded-lg text-sm font-medium transition-colors',
              canGenerate
                ? 'bg-accent hover:bg-accent-hover text-white'
                : 'bg-border text-secondary cursor-not-allowed',
            ].join(' ')}
          >
            Generate
          </button>
        </div>
      </main>
    </div>
  )
}
