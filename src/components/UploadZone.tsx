import { useRef, useState, DragEvent, ChangeEvent } from 'react'

interface Props {
  label: string
  hint?: string
  accept?: string
  fileName?: string
  onFile: (file: File) => void
}

export default function UploadZone({ label, hint, accept = '.csv,.json', fileName, onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFile(file)
    // Reset so the same file can be re-uploaded
    e.target.value = ''
  }

  const hasFile = Boolean(fileName)

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => inputRef.current?.click()}
      onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={[
        'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors select-none',
        dragging ? 'border-accent bg-accent/5' :
        hasFile  ? 'border-success bg-green-50' :
                   'border-border hover:border-accent',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />

      {hasFile ? (
        <div className="flex flex-col items-center gap-1">
          <svg className="w-6 h-6 text-success" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
          <p className="text-sm font-medium text-success truncate max-w-full px-2">{fileName}</p>
          <p className="text-xs text-secondary">Click to replace</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-sm font-medium text-primary">{label}</p>
          {hint && <p className="text-xs text-secondary">{hint}</p>}
          <p className="text-xs text-secondary">
            Drag and drop or <span className="text-accent font-medium">browse</span>
          </p>
        </div>
      )}
    </div>
  )
}
