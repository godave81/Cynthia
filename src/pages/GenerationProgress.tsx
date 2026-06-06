import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useJob } from '../context/JobContext'
import { generateSyntheticData, generateSyntheticDataBatched, BATCH_SIZE, validateOutput, buildUploadPathPrompt } from '../utils/generator'
import { buildConsolidatedCsv } from '../utils/csvBuilder'
import { calculatePrivacyScore } from '../utils/privacyScore'
import { profileData } from '../utils/statisticalProfiler'
import { calculateSimilarityScore } from '../utils/similarityScore'
import { validateIntegrity, fixIntegrityViolations } from '../utils/integrityValidator'

const STEPS = [
  'Sending generation request\u2026',
  'Generating Provider records\u2026',
  'Generating Member records\u2026',
  'Generating Claims records\u2026',
  'Running compliance checks\u2026',
  'Building output dataset\u2026',
]

export default function GenerationProgress() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { job, updateJob } = useJob()

  const noUpload = job.noUpload || searchParams.get('noUpload') === 'true'

  const [stepIdx, setStepIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [batchInfo, setBatchInfo] = useState<{ current: number; total: number } | null>(null)
  const hasStarted = useRef(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    // Build the final prompt depending on the path
    let prompt: string
    if (noUpload) {
      // Predefined path: use the prompt as-is (already specifies count + specialty)
      prompt = job.prompt || 'Generate 10 synthetic medical claims for the United States, 2025-2026'
    } else {
      // Upload path: augment with statistical profile + field rules + row count
      const profile = job.sourceRows && job.sourceHeaders
        ? profileData(job.sourceRows, job.sourceHeaders)
        : null
      prompt = buildUploadPathPrompt(
        job.prompt || 'Generate synthetic medical claims',
        job.rowCount || 1000,
        profile,
        job.schemaFields,
      )
    }

    const progressTimer = setInterval(() => {
      setProgress(p => (p < 85 ? p + 1.5 : p))
    }, 300)
    const stepTimer = setInterval(() => {
      setStepIdx(i => Math.min(i + 1, STEPS.length - 2))
    }, 3000)
    // 60-minute hard timeout per PRD Section 9
    const timeoutTimer = setTimeout(() => {
      clearInterval(progressTimer)
      clearInterval(stepTimer)
      setTimedOut(true)
    }, 60 * 60 * 1000)

    // Enforce row cap before making the API call (belt-and-suspenders — UI also blocks this)
    if (!noUpload && (job.rowCount ?? 0) > 100_000) {
      clearInterval(progressTimer)
      clearInterval(stepTimer)
      const msg = 'Generation is capped at 100,000 records per job. Please reduce your row count.'
      setError(msg)
      updateJob({ generationError: msg })
      return
    }

    // Shared success handler
    const handleDataset = (dataset: Awaited<ReturnType<typeof generateSyntheticData>>) => {
      clearInterval(progressTimer)
      clearInterval(stepTimer)
      clearTimeout(timeoutTimer)
      setStepIdx(STEPS.length - 1)
      setProgress(100)

      // Integrity check — fix in-memory if violations found (targeted fix, no second API call)
      const preCheckResult = validateIntegrity(dataset.rows)
      let finalRows = dataset.rows
      let integrityResult = preCheckResult
      if (!preCheckResult.passed) {
        const fixed = fixIntegrityViolations(dataset.rows)
        finalRows = fixed.rows
        // Re-validate after fix — should pass
        const postCheck = validateIntegrity(finalRows)
        integrityResult = { ...postCheck, fixedCount: fixed.fixedCount }
      }
      const finalDataset = { rows: finalRows }

      const issues = validateOutput(finalDataset)
      const privacyScore = calculatePrivacyScore(issues)
      const csvData = buildConsolidatedCsv(finalDataset)

      // Compute similarity score if source data was uploaded
      const similarityScore =
        !noUpload && job.sourceRows && job.sourceHeaders && job.sourceRows.length >= 2
          ? calculateSimilarityScore(job.sourceRows, job.sourceHeaders, finalDataset.rows)
          : null

      updateJob({ generatedData: finalDataset, privacyScore, similarityScore, integrityResult, csvData, generationError: null })
      setTimeout(() => navigate('/jobs/report'), 800)
    }

    const handleError = (err: unknown) => {
      clearInterval(progressTimer)
      clearInterval(stepTimer)
      clearTimeout(timeoutTimer)
      const msg = err instanceof Error ? err.message : 'Generation failed. Please try again.'
      setError(msg)
      updateJob({ generationError: msg })
    }

    // Choose single-call or batched generation
    const rowCount = job.rowCount || 1000
    if (!noUpload && rowCount > BATCH_SIZE) {
      // Batched path — stop fake-progress timers; real progress comes from the callback
      clearInterval(progressTimer)
      clearInterval(stepTimer)
      generateSyntheticDataBatched(prompt, rowCount, (completed, total) => {
        setBatchInfo({ current: completed, total })
        setProgress(Math.round((completed / total) * 100))
      }).then(handleDataset).catch(handleError)
    } else {
      generateSyntheticData(prompt).then(handleDataset).catch(handleError)
    }

    return () => {
      clearInterval(progressTimer)
      clearInterval(stepTimer)
      clearTimeout(timeoutTimer)
    }
  }, [])

  // ── Timeout state ──────────────────────────────────────────────────────────
  if (timedOut) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="bg-surface border-b border-border">
          <div className="max-w-3xl mx-auto px-10 py-5">
            <span className="text-sm font-semibold text-primary">Generation Timed Out</span>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-10 py-10 flex-1 w-full">
          <div className="bg-surface border border-warning rounded-xl p-8">
            <div className="flex items-start gap-3 mb-6">
              <svg className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-warning mb-1">Job Timed Out</p>
                <p className="text-sm text-secondary">
                  This job has been running for over 60 minutes. This may indicate a network issue or an unusually large request.
                  Start a new job with a smaller row count, or try again.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/')}
              className="bg-accent hover:bg-accent-hover text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="bg-surface border-b border-border">
          <div className="max-w-3xl mx-auto px-10 py-5">
            <span className="text-sm font-semibold text-primary">Generation Failed</span>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-10 py-10 flex-1 w-full">
          <div className="bg-surface border border-error rounded-xl p-8">
            <div className="flex items-start gap-3 mb-6">
              <svg className="w-5 h-5 text-error flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-error mb-1">Generation Failed</p>
                <p className="text-sm text-secondary">{error}</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/jobs/new')}
              className="bg-accent hover:bg-accent-hover text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              Start Over
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ── Progress state ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-surface border-b border-border">
        <div className="max-w-3xl mx-auto px-10 py-5">
          <span className="text-sm font-semibold text-primary">Generating Your Dataset</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-10 py-10 flex-1 w-full">
        <div className="bg-surface border border-border rounded-xl p-6 mb-8">
          <p className="text-xs font-medium text-secondary uppercase tracking-wide mb-3">Job Summary</p>
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-xs text-secondary">Prompt</dt>
              <dd className="text-sm text-primary mt-0.5">{job.prompt || '\u2014'}</dd>
            </div>
            <div>
              <dt className="text-xs text-secondary">Source File</dt>
              <dd className="text-sm text-primary mt-0.5">
                {noUpload ? 'None \u2014 domain knowledge only' : (job.sourceFile?.name ?? '\u2014')}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-secondary">Records Requested</dt>
              <dd className="text-sm text-primary mt-0.5">
                {noUpload ? '10' : (job.rowCount?.toLocaleString() ?? '\u2014')}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-secondary">Output Format</dt>
              <dd className="text-sm text-primary mt-0.5">CSV (consolidated flat file)</dd>
            </div>
          </dl>
        </div>

        <div className="bg-surface border border-border rounded-xl p-8">
          <div className="mb-8">
            <p className="text-sm font-medium text-primary mb-3">
            {batchInfo
              ? `Generating batch ${batchInfo.current} of ${batchInfo.total}…`
              : STEPS[stepIdx]
            }
          </p>
            <div className="w-full bg-border rounded-full h-2">
              <div
                className="bg-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.round(progress)}%` }}
              />
            </div>
            <p className="text-xs text-secondary mt-2">
              {batchInfo
                ? `Batch ${batchInfo.current} of ${batchInfo.total} — ${Math.round(progress)}% complete`
                : `${Math.round(progress)}% complete`
              }
            </p>
          </div>

          <div className="space-y-2 max-w-sm mx-auto">
            {STEPS.slice(0, STEPS.length - 1).map((label, i) => (
              <div key={label} className="flex items-center gap-2.5">
                {i < stepIdx ? (
                  <svg className="w-4 h-4 text-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : i === stepIdx ? (
                  <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-border flex-shrink-0" />
                )}
                <span className={[
                  'text-sm',
                  i < stepIdx   ? 'text-secondary line-through' :
                  i === stepIdx  ? 'text-primary font-medium' :
                                   'text-secondary',
                ].join(' ')}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-secondary hover:text-primary transition-colors"
          >
            Cancel Job
          </button>
        </div>
      </main>
    </div>
  )
}
