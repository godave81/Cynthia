type Status = 'In Progress' | 'Complete' | 'Failed' | 'Blocked'

const styles: Record<Status, string> = {
  'In Progress': 'bg-blue-100 text-blue-700',
  'Complete':    'bg-green-100 text-[#0F6E56]',
  'Failed':      'bg-red-100 text-[#A32D2D]',
  'Blocked':     'bg-orange-100 text-[#BA7517]',
}

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  )
}
