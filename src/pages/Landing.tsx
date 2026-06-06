import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background font-sans">

      {/* ── Nav ───────────────────────────────────────────────── */}
      <nav className="bg-[#0D1117] border-b border-[#1F2937]">
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-white text-xs font-bold">C</span>
            </div>
            <span className="text-white text-base font-semibold tracking-tight">Cynthia</span>
            <span className="text-xs text-[#6B7280] border border-[#374151] rounded px-2 py-0.5 ml-1 hidden sm:inline">
              Healthcare Synthetic Data
            </span>
          </div>
          <button
            onClick={() => navigate('/app')}
            className="bg-accent hover:bg-accent-hover text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            Launch App →
          </button>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="bg-[#0D1117] pt-24 pb-28 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#0F6E56]/20 border border-[#0F6E56]/40 text-[#34D399] text-xs font-medium px-4 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] inline-block" />
            Zero PHI — Every generation, guaranteed
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight tracking-tight mb-6">
            Synthetic Healthcare Data.
            <br />
            <span className="text-[#34D399]">Without the Wait.</span>
          </h1>

          <p className="text-[#9CA3AF] text-lg leading-relaxed max-w-2xl mx-auto mb-10">
            Cynthia generates statistically faithful Provider, Member, and Claims data
            — HIPAA-safe, referentially intact, and ready to download. Stop waiting
            on legal review. Start training your models.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/app')}
              className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-8 py-3 rounded-lg transition-colors w-full sm:w-auto"
            >
              Launch Cynthia →
            </button>
            <a
              href="#how-it-works"
              className="text-[#9CA3AF] hover:text-white text-sm font-medium transition-colors w-full sm:w-auto text-center"
            >
              See how it works ↓
            </a>
          </div>
        </div>

        {/* Stats bar */}
        <div className="max-w-3xl mx-auto mt-16 grid grid-cols-3 gap-px bg-[#1F2937] rounded-xl overflow-hidden border border-[#1F2937]">
          {[
            { value: '17 / 17', label: 'Test cases passing' },
            { value: '18', label: 'HIPAA identifiers blocked' },
            { value: '100k', label: 'Max rows per job' },
          ].map(({ value, label }) => (
            <div key={label} className="bg-[#111827] px-8 py-5 text-center">
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-[#6B7280] mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Problem ───────────────────────────────────────────── */}
      <section className="bg-surface border-b border-border py-16 px-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-secondary uppercase tracking-widest text-center mb-10">
            The problem with getting training data in healthcare
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                problem: 'Weeks of legal review',
                fix: 'Real patient data requires BAAs, de-identification audits, and compliance sign-off before a single row reaches your environment.',
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
                problem: 'Hand-crafted Excel sheets',
                fix: 'Manually fabricating sample records column by column produces flat, unrealistic data that fails statistical validation.',
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ),
                problem: 'Compliance risk',
                fix: 'One identifier slipping through into a training dataset is a reportable HIPAA violation. Manual processes have no safety net.',
              },
            ].map(({ icon, problem, fix }) => (
              <div key={problem} className="flex flex-col gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-error">
                  {icon}
                </div>
                <p className="text-sm font-semibold text-primary">{problem}</p>
                <p className="text-sm text-secondary leading-relaxed">{fix}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────── */}
      <section id="how-it-works" className="bg-background py-20 px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-secondary uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-2xl font-bold text-primary">From prompt to download in three steps</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden sm:block absolute top-6 left-1/3 right-1/3 h-px bg-border" />

            {[
              {
                step: '01',
                title: 'Write a prompt',
                body: 'Describe what you need — specialty, geography, row count, date range. Or click a predefined template to get started in seconds.',
                icon: (
                  <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                ),
              },
              {
                step: '02',
                title: 'Upload your sample',
                body: 'Optionally upload a source CSV (up to 5,000 rows). Cynthia profiles its distributions and applies them to the synthetic output.',
                icon: (
                  <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                ),
              },
              {
                step: '03',
                title: 'Download your data',
                body: 'Get a single consolidated CSV — Provider, Member, and Claims inline — with a Compliance Report showing Privacy Score and Similarity Score.',
                icon: (
                  <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                ),
              },
            ].map(({ step, title, body, icon }) => (
              <div key={step} className="bg-surface border border-border rounded-xl p-6 relative">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4">
                  {icon}
                </div>
                <p className="text-xs font-bold text-accent mb-2">{step}</p>
                <p className="text-sm font-semibold text-primary mb-2">{title}</p>
                <p className="text-sm text-secondary leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────── */}
      <section className="bg-surface border-y border-border py-20 px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-secondary uppercase tracking-widest mb-3">Built-in safeguards</p>
            <h2 className="text-2xl font-bold text-primary">Compliance isn't an afterthought</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                title: 'PHI Scanner',
                badge: 'Upload protection',
                body: 'Scans every uploaded file for all 18 HIPAA-designated identifiers — column names and value patterns. Blocks processing before a single row is touched.',
                color: 'bg-red-50 border-red-100 text-error',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
              },
              {
                title: 'Statistical Profiler',
                badge: 'Data quality',
                body: 'Learns numeric distributions, categorical frequencies, and pairwise correlations from your source sample. Generated data mirrors your real patterns, not random noise.',
                color: 'bg-blue-50 border-blue-100 text-blue-600',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
              },
              {
                title: 'Referential Integrity',
                badge: 'Auto-corrected',
                body: 'Every Claims row is validated against its Provider and Member records. Inconsistencies are automatically normalised before the Compliance Report is generated.',
                color: 'bg-green-50 border-green-100 text-success',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                ),
              },
              {
                title: 'Compliance Report',
                badge: 'Every job',
                body: 'Every generation produces a Privacy Score (0–100) and, when a source sample is present, a 3-dimension Similarity Score: statistical, distribution, and correlation.',
                color: 'bg-[#0F6E56]/10 border-[#0F6E56]/20 text-accent',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
              },
            ].map(({ title, badge, body, color, icon }) => (
              <div key={title} className="bg-background border border-border rounded-xl p-6 flex gap-4">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5 ${color}`}>
                  {icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="text-sm font-semibold text-primary">{title}</p>
                    <span className="text-xs text-secondary border border-border rounded px-2 py-0.5">{badge}</span>
                  </div>
                  <p className="text-sm text-secondary leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="bg-[#0D1117] py-24 px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to generate?</h2>
          <p className="text-[#9CA3AF] text-base mb-10">
            Write a prompt. Upload a sample. Download HIPAA-safe synthetic data in minutes.
          </p>
          <button
            onClick={() => navigate('/app')}
            className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-10 py-3.5 rounded-lg transition-colors"
          >
            Launch Cynthia →
          </button>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="bg-[#0D1117] border-t border-[#1F2937] py-6 px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-accent flex items-center justify-center">
              <span className="text-white text-[9px] font-bold">C</span>
            </div>
            <span className="text-[#6B7280] text-xs">Cynthia — Internal Tool</span>
          </div>
          <p className="text-[#4B5563] text-xs">HIPAA-safe · Zero PHI · Internal use only</p>
        </div>
      </footer>

    </div>
  )
}
