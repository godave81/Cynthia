// Shared job state across all screens.
// Persists across navigation — lives at App level inside JobProvider.

import { createContext, useContext, useState, ReactNode } from 'react'
import type { PhiScanResult } from '../utils/phiScanner'
import type { SchemaField } from '../utils/schemaParser'
import type { GeneratedDataset } from '../utils/generator'
import type { SimilarityScore } from '../utils/similarityScore'
import type { IntegrityResult } from '../utils/integrityValidator'

export type { SchemaField, GeneratedDataset, SimilarityScore, IntegrityResult }

export interface PhiState extends PhiScanResult {
  scanning: boolean
}

export interface JobState {
  // Setup
  prompt: string
  noUpload: boolean
  sourceFile: { name: string; rowCount: number } | null
  sourceRows: Record<string, string>[] | null
  sourceHeaders: string[] | null
  schemaFile: { name: string } | null
  phi: PhiState
  schemaFields: SchemaField[]
  // Generation config (from SchemaReview)
  rowCount: number
  // Generation results (populated after GenerationProgress completes)
  generatedData: GeneratedDataset | null
  privacyScore: number | null
  similarityScore: SimilarityScore | null
  csvData: string | null
  integrityResult: IntegrityResult | null
  generationError: string | null
}

const DEFAULT: JobState = {
  prompt: '',
  noUpload: false,
  sourceFile: null,
  sourceRows: null,
  sourceHeaders: null,
  schemaFile: null,
  phi: { scanning: false, passed: false, flaggedColumns: [] },
  schemaFields: [],
  rowCount: 1000,
  generatedData: null,
  privacyScore: null,
  similarityScore: null,
  csvData: null,
  integrityResult: null,
  generationError: null,
}

interface Ctx {
  job: JobState
  updateJob: (patch: Partial<JobState>) => void
  resetJob: () => void
}

const JobContext = createContext<Ctx | null>(null)

export function JobProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<JobState>(DEFAULT)

  function updateJob(patch: Partial<JobState>) {
    setJob(prev => ({ ...prev, ...patch }))
  }

  function resetJob() {
    setJob(DEFAULT)
  }

  return (
    <JobContext.Provider value={{ job, updateJob, resetJob }}>
      {children}
    </JobContext.Provider>
  )
}

export function useJob(): Ctx {
  const ctx = useContext(JobContext)
  if (!ctx) throw new Error('useJob must be used inside JobProvider')
  return ctx
}
