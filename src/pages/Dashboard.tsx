import { useNavigate } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge'

const EXAMPLE_JOBS = [
  { id: '1', name: '5,000 orthopedic claims — Texas', rows: 5000, status: 'Complete' as const, date: '2026-05-20', hasReport: true },
  { id: '2', name: '10,000 cardiology claims — 10 states', rows: 10000, status: 'In Progress' as const, date: '2026-05-22', hasReport: false },
  { id: '3', name: '2,000 general surgery claims — Florida', rows: 2000, status: 'Failed' as const, date: '2026-05-18', hasReport: false },
  { id: '4', name: 'Member upload — SSN detected', rows: 0, status: 'Blocked' as const, date: '2026-05-17', hasReport: false },
]

export default function Dashboard() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-border">
        <div className="max-w-5xl mx-auto px-10 py-6 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 no-underline">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-white text-xs font-bold">C</span>
            </div>
            <span className="text-lg font-semibold text-primary">Cynthia</span>
            <span className="text-xs text-secondary border border-border rounded px-2 py-0.5 ml-1">Healthcare Synthetic Data</span>
          </a>
          <button
            onClick={() => navigate('/jobs/new')}
            className="bg-accent hover:bg-accent-hover text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            + New Generation Job
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-10 py-8">
        {/* Recent Jobs */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-primary">Recent Jobs</h2>
          <p className="text-xs text-secondary mt-0.5">Current session only — jobs are not persisted between sessions</p>
        </div>

        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          {EXAMPLE_JOBS.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-secondary text-sm">No jobs yet. Click <strong>New Generation Job</strong> to get started.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wide">Job</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wide">Rows</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wide">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {EXAMPLE_JOBS.map((job) => (
                  <tr key={job.id} className="hover:bg-background transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-primary">{job.name}</td>
                    <td className="px-6 py-4 text-sm text-secondary">{job.rows > 0 ? job.rows.toLocaleString() : '—'}</td>
                    <td className="px-6 py-4"><StatusBadge status={job.status} /></td>
                    <td className="px-6 py-4 text-sm text-secondary">{job.date}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {job.status === 'Complete' && (
                          <button className="text-xs text-secondary hover:text-primary border border-border rounded px-3 py-1.5 transition-colors">
                            Download
                          </button>
                        )}
                        {job.hasReport && (
                          <button
                            onClick={() => navigate('/jobs/report')}
                            className="text-xs text-accent hover:text-accent-hover font-medium"
                          >
                            View Report
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
