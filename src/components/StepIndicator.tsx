export default function StepIndicator({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-secondary mb-6">
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent text-white text-xs font-semibold">{step}</span>
      <span>Step {step} of {total} — {label}</span>
    </div>
  )
}
