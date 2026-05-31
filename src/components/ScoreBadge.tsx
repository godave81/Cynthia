function scoreColor(score: number) {
  if (score >= 85) return '#1D9E75'
  if (score >= 70) return '#BA7517'
  return '#A32D2D'
}

export default function ScoreBadge({ score }: { score: number }) {
  const color = scoreColor(score)
  return (
    <span style={{ color, fontSize: '48px', fontWeight: 700, lineHeight: 1 }}>
      {score}
    </span>
  )
}

export function scoreColorClass(score: number) {
  if (score >= 85) return 'text-success'
  if (score >= 70) return 'text-warning'
  return 'text-error'
}
