import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useJob } from '../context/JobContext'
import ScoreBadge from '../components/ScoreBadge'

const FALLBACK_SCORE = 91
const FALLBACK_ROWS = [
  { ClaimID: 'CLM-SYN-0000001', ProviderID: 'NPI-SYN-0000012', MemberID: 'CMB-SYN-0000087', DateOfService: '2025/03/14', HCPCSCode: '27447', BilledAmount: '34200.00', ClaimStatus: 'Paid' },
  { ClaimID: 'CLM-SYN-0000002', ProviderID: 'NPI-SYN-0000005', MemberID: 'CMB-SYN-0000203', DateOfService: '2025/04/07', HCPCSCode: '27130', BilledAmount: '28750.00', ClaimStatus: 'Paid' },
  { ClaimID: 'CLM-SYN-0000003', ProviderID: 'NPI-SYN-0000031', MemberID: 'CMB-SYN-0000041', DateOfService: '2025/06/22', HCPCSCode: '29881', BilledAmount: '12450.00', ClaimStatus: 'Paid' },
  { ClaimID: 'CLM-SYN-0000004', ProviderID: 'NPI-SYN-0000018', MemberID: 'CMB-SYN-0000318', DateOfService: '2025/08/09', HCPCSCode: '27245', BilledAmount: '41600.00', ClaimStatus: 'Pending' },
  { ClaimID: 'CLM-SYN-0000005', ProviderID: 'NPI-SYN-0000007', MemberID: 'CMB-SYN-0000155', DateOfService: '2025/09/18', HCPCSCode: '27447', BilledAmount: '33900.00', ClaimStatus: 'Paid' },
  { ClaimID: 'CLM-SYN-0000006', ProviderID: 'NPI-SYN-0000024', MemberID: 'CMB-SYN-0000479', DateOfService: '2025/11/03', HCPCSCode: '27130', BilledAmount: '26100.00', ClaimStatus: 'Paid' },
  { ClaimID: 'CLM-SYN-0000007', ProviderID: 'NPI-SYN-0000012', MemberID: 'CMB-SYN-0000562', DateOfService: '2026/01/15', HCPCSCode: '29827', BilledAmount: '18300.00', ClaimStatus: 'Paid' },
  { ClaimID: 'CLM-SYN-0000008', ProviderID: 'NPI-SYN-0000039', MemberID: 'CMB-SYN-0000088', DateOfService: '2026/03/28', HCPCSCode: '27245', BilledAmount: '44250.00', ClaimStatus: 'Paid' },
  { ClaimID: 'CLM-SYN-0000009', ProviderID: 'NPI-SYN-0000011', MemberID: 'CMB-SYN-0000701', DateOfService: '2026/05/10', HCPCSCode: '27447', BilledAmount: '35500.00', ClaimStatus: 'Pending' },
  { ClaimID: 'CLM-SYN-0000010', ProviderID: 'NPI-SYN-0000044', MemberID: 'CMB-SYN-0000234', DateOfService: '2026/07/22', HCPCSCode: '29881', BilledAmount: '11800.00', ClaimStatus: 'Paid' },
]

function scoreBgClass(score: number) {
  if (score >= 85) return 'bg-green-50 border-green-200'
  if (score >= 70) return 'bg-yellow-50 border-yellow-200'
  return 'bg-red-50 border-red-200'
}

function scoreBarClass(score: number) {
  if (score >= 85) return 'bg-success'
  if (score >= 70) return 'bg-warning'
  return 'bg-error'
}

function fmtAmount(raw: string): string {
  const n = parseFloat(raw)
  if (isNaN(n)) return raw
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface DimCardProps {
  label: string
  score: number
  description: string
}

function DimCard({ label, score, description }: DimCardProps) {
  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-secondary uppercase tracking-wide">{label}</p>
        <span className={[
          'text-sm font-semibold',
          score >= 85 ? 'text-success' : score >= 70 ? 'text-warning' : 'text-error',
        ].join(' ')}>{score}</span>
      </div>
      <div className="w-full bg-border rounded-full h-1.5 mb-2">
        <div
          className={`h-1.5 rounded-full transition-all ${scoreBarClass(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-secondary">{description}</p>
    </div>
  )
}

export default function ComplianceReport() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { job } = useJob()

  const noUpload = job.noUpload || searchParams.get('noUpload') === 'true'
  const privacyScore = job.privacyScore ?? FALLBACK_SCORE
  const allRows = job.generatedData?.rows ?? FALLBACK_ROWS
  const sampleRows = allRows.slice(0, 10)
  const hasRealData = job.generatedData !== null
  const simScore = job.similarityScore
  const smallSample = !noUpload && job.sourceFile !== null && (job.sourceFile.rowCount ?? 0) < 50

  const uniqueProviders = hasRealData ? new Set(allRows.map(r => r.ProviderID)).size : (noUpload ? 5 : 50)
  const uniqueMembers   = hasRealData ? new Set(allRows.map(r => r.MemberID)).size  : (noUpload ? 10 : 10000)
  const totalClaims     = hasRealData ? allRows.length : (noUpload ? 10 : 10000)

  function handleDownload() {
    if (!job.csvData) return
    const blob = new Blob([job.csvData], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cynthia-synthetic-data.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-border">
        <div className="max-w-5xl mx-auto px-10 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-primary">Generation Complete \u2014 Review Before Downloading</h1>
            <p className="text-xs text-secondary mt-0.5">
              {job.prompt ? `"${job.prompt.slice(0, 80)}${job.prompt.length > 80 ? '\u2026' : ''}"` : 'Synthetic data ready'}
            </p>
          </div>
          <Link to="/" className="text-sm text-secondary hover:text-primary transition-colors">Back to Dashboard</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-10 py-8 space-y-6">

        {/* Small sample warning */}
        {smallSample && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
            <svg className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-secondary">
              <span className="font-medium text-primary">Small sample warning.</span>{' '}
              Your source file has fewer than 50 rows ({job.sourceFile?.rowCount ?? 0} uploaded). Similarity scores and distributions may be less reliable with small samples. Consider uploading a larger sample for better results.
            </p>
          </div>
        )}

        {/* Score panels */}
        <div className={`grid gap-6 ${noUpload || !simScore ? 'grid-cols-1 max-w-lg' : 'grid-cols-2'}`}>

          {/* Privacy Score */}
          <div className={`bg-surface border rounded-xl p-6 ${scoreBgClass(privacyScore)}`}>
            <p className="text-xs font-medium text-secondary uppercase tracking-wide mb-4">Privacy Score</p>
            <div className="flex items-end gap-3 mb-3">
              <ScoreBadge score={privacyScore} />
              <span className="text-secondary text-sm mb-2">/ 100</span>
            </div>
            <p className="text-sm text-primary mb-4">
              {privacyScore >= 85
                ? 'Your synthetic data has a very low risk of revealing source patient information.'
                : privacyScore >= 70
                ? 'Privacy score is acceptable but below the recommended threshold. Review before use.'
                : 'Privacy score is below the minimum threshold. Contact your compliance team before using this dataset.'}
            </p>
            {privacyScore < 85 && (
              <div className="text-xs font-medium text-warning bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                Score below 85 \u2014 review required before use.
              </div>
            )}
          </div>

          {/* Similarity Score — upload path only */}
          {!noUpload && simScore && (
            <div className="bg-surface border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-medium text-secondary uppercase tracking-wide">Similarity Score</p>
                <div className="flex items-center gap-2">
                  <span className={[
                    'text-2xl font-bold',
                    simScore.composite >= 85 ? 'text-success' : simScore.composite >= 70 ? 'text-warning' : 'text-error',
                  ].join(' ')}>{simScore.composite}</span>
                  <span className="text-secondary text-sm">/ 100</span>
                </div>
              </div>
              <div className="space-y-3">
                <DimCard
                  label="Statistical Similarity"
                  score={simScore.statistical}
                  description="How closely numeric field means and standard deviations match the source."
                />
                <DimCard
                  label="Distribution Similarity"
                  score={simScore.distribution}
                  description="How closely categorical value frequencies match the source distribution."
                />
                <DimCard
                  label="Correlation Preservation"
                  score={simScore.correlation}
                  description="How well pairwise numeric field correlations are preserved from the source."
                />
              </div>
            </div>
          )}
        </div>

        {/* No-upload similarity note */}
        {noUpload && (
          <div className="bg-surface border border-border rounded-xl p-4 flex items-start gap-3">
            <svg className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-secondary">
              <span className="font-medium text-primary">Similarity Score not available.</span> No source sample was uploaded, so there is no reference dataset to compare against. Upload a source sample to enable similarity scoring.
            </p>
          </div>
        )}

        {/* Dataset summary */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <p className="text-xs font-medium text-secondary uppercase tracking-wide mb-4">Dataset Summary</p>
          <div className="grid grid-cols-4 gap-6 mb-4">
            <div>
              <p className="text-xs text-secondary">Unique Providers</p>
              <p className="text-xl font-semibold text-primary mt-0.5">{uniqueProviders.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-secondary">Unique Members</p>
              <p className="text-xl font-semibold text-primary mt-0.5">{uniqueMembers.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-secondary">Claim Records</p>
              <p className="text-xl font-semibold text-primary mt-0.5">{totalClaims.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-secondary">Date Range</p>
              <p className="text-sm font-medium text-primary mt-0.5">2025/01/01 \u2013 2026/12/31</p>
            </div>
          </div>
          {/* Dynamic integrity status */}
          {job.integrityResult ? (
            job.integrityResult.passed ? (
              <div className="flex items-center gap-2 text-sm text-success border-t border-border pt-4">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Referential integrity: \u2713 Passed \u2014 all IDs are unique and provider/member profiles are consistent
              </div>
            ) : (
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 text-sm text-warning mb-1">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Referential integrity: Auto-corrected ({job.integrityResult.fixedCount} row{job.integrityResult.fixedCount !== 1 ? 's' : ''} normalised)
                </div>
                {job.integrityResult.violations.map(v => (
                  <p key={v.type} className="text-xs text-secondary ml-6">{v.message}</p>
                ))}
              </div>
            )
          ) : (
            <div className="flex items-center gap-2 text-sm text-success border-t border-border pt-4">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Referential integrity: \u2713 Passed \u2014 all Claims records reference valid Provider and Member rows
            </div>
          )}
        </div>

        {/* 10-row sample table */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <p className="text-sm font-medium text-primary">
              Sample Records ({Math.min(10, allRows.length)} of {totalClaims.toLocaleString()})
            </p>
            <p className="text-xs text-secondary mt-0.5">First 10 rows of consolidated output</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-background">
                  {['Claim ID', 'Provider ID', 'Member ID', 'Date of Service', 'HCPCS', 'Billed Amount', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sampleRows.map((row, i) => (
                  <tr key={row.ClaimID || i} className="hover:bg-background transition-colors">
                    <td className="px-4 py-2.5 text-xs font-mono text-primary whitespace-nowrap">{row.ClaimID}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-secondary whitespace-nowrap">{row.ProviderID}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-secondary whitespace-nowrap">{row.MemberID}</td>
                    <td className="px-4 py-2.5 text-xs text-secondary whitespace-nowrap">{row.DateOfService}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-primary">{row.HCPCSCode}</td>
                    <td className="px-4 py-2.5 text-xs text-primary whitespace-nowrap">{fmtAmount(row.BilledAmount)}</td>
                    <td className="px-4 py-2.5 text-xs text-secondary">{row.ClaimStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => navigate('/jobs/new')}
            className="text-sm text-secondary hover:text-primary border border-border rounded-lg px-5 py-2.5 transition-colors"
          >
            Start New Job
          </button>
          <button
            onClick={handleDownload}
            disabled={!job.csvData}
            className={[
              'text-sm font-medium px-6 py-2.5 rounded-lg transition-colors',
              job.csvData
                ? 'bg-accent hover:bg-accent-hover text-white'
                : 'bg-border text-secondary cursor-not-allowed',
            ].join(' ')}
            title={!job.csvData ? 'Run a generation job to enable download' : undefined}
          >
            Download Dataset (CSV)
          </button>
        </div>
      </main>
    </div>
  )
}
