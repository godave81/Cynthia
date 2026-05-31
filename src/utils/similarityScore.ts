// Three-dimension similarity score comparing source sample to generated dataset.
// Dimensions: Statistical (numeric field stats), Distribution (categorical freqs),
// Correlation (pairwise numeric correlations).

import type { SyntheticRow } from './generator'

export interface SimilarityScore {
  statistical: number   // 0-100
  distribution: number  // 0-100
  correlation: number   // 0-100
  composite: number     // 40% stat + 40% dist + 20% corr
}

function parseNum(v: string): number {
  return parseFloat((v ?? '').replace(/[$,]/g, ''))
}

function isNumericCol(rows: Record<string, string>[], col: string): boolean {
  const vals = rows.map(r => (r[col] ?? '').trim()).filter(v => v)
  return vals.length > 0 && vals.filter(v => !isNaN(parseNum(v))).length / vals.length >= 0.8
}

function mean(nums: number[]): number {
  return nums.reduce((s, n) => s + n, 0) / nums.length
}

function stdDev(nums: number[], m: number): number {
  return Math.sqrt(nums.reduce((s, n) => s + (n - m) ** 2, 0) / nums.length)
}

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (n < 2) return 0
  const ma = mean(a.slice(0, n))
  const mb = mean(b.slice(0, n))
  const num = a.slice(0, n).reduce((s, x, i) => s + (x - ma) * (b[i] - mb), 0)
  const da = stdDev(a.slice(0, n), ma)
  const db = stdDev(b.slice(0, n), mb)
  return da * db === 0 ? 0 : num / (da * db * n)
}

// Map generated row fields to a generic Record for uniform processing.
function toRecord(row: SyntheticRow): Record<string, string> {
  return row as unknown as Record<string, string>
}

export function calculateSimilarityScore(
  sourceRows: Record<string, string>[],
  sourceHeaders: string[],
  generatedRows: SyntheticRow[],
): SimilarityScore {
  const genRecords = generatedRows.map(toRecord)
  const genHeaders = Object.keys(genRecords[0] ?? {})

  // Match source headers to generated headers (case-insensitive, strip non-alphanum)
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  function matchHeader(srcCol: string): string | null {
    const n = norm(srcCol)
    return genHeaders.find(h => norm(h) === n) ?? null
  }

  const numericCols = sourceHeaders.filter(h => isNumericCol(sourceRows, h))
  const catCols = sourceHeaders.filter(h => !numericCols.includes(h))

  // ── Statistical similarity ─────────────────────────────────────────────
  const statScores: number[] = []
  for (const col of numericCols) {
    const genCol = matchHeader(col)
    if (!genCol) continue

    const srcNums = sourceRows.map(r => parseNum(r[col])).filter(n => !isNaN(n))
    const genNums = genRecords.map(r => parseNum(r[genCol])).filter(n => !isNaN(n))
    if (srcNums.length < 2 || genNums.length < 2) continue

    const srcMean = mean(srcNums)
    const genMean = mean(genNums)
    const srcStd  = stdDev(srcNums, srcMean)
    const genStd  = stdDev(genNums, genMean)

    const meanDiff = srcMean !== 0 ? Math.abs(srcMean - genMean) / Math.abs(srcMean) : 0
    const stdDiff  = srcStd  !== 0 ? Math.abs(srcStd  - genStd)  / Math.abs(srcStd)  : 0
    statScores.push(Math.max(0, 100 - (meanDiff + stdDiff) * 50))
  }
  const statistical = statScores.length > 0
    ? statScores.reduce((s, n) => s + n, 0) / statScores.length
    : 80

  // ── Distribution similarity ────────────────────────────────────────────
  const distScores: number[] = []
  for (const col of catCols) {
    const genCol = matchHeader(col)
    if (!genCol) continue

    const srcVals = sourceRows.map(r => (r[col] ?? '').trim()).filter(v => v)
    const genVals = genRecords.map(r => (r[genCol] ?? '').trim()).filter(v => v)
    if (srcVals.length === 0 || genVals.length === 0) continue

    const srcFreq: Record<string, number> = {}
    srcVals.forEach(v => { srcFreq[v] = (srcFreq[v] ?? 0) + 1 / srcVals.length })
    const genFreq: Record<string, number> = {}
    genVals.forEach(v => { genFreq[v] = (genFreq[v] ?? 0) + 1 / genVals.length })

    const allVals = new Set([...Object.keys(srcFreq), ...Object.keys(genFreq)])
    let overlap = 0
    for (const v of allVals) overlap += Math.min(srcFreq[v] ?? 0, genFreq[v] ?? 0)
    distScores.push(overlap * 100)
  }
  const distribution = distScores.length > 0
    ? distScores.reduce((s, n) => s + n, 0) / distScores.length
    : 80

  // ── Correlation preservation ───────────────────────────────────────────
  let correlation = 85
  if (numericCols.length >= 2) {
    const srcCorrs: number[] = []
    const genCorrs: number[] = []

    for (let i = 0; i < numericCols.length - 1; i++) {
      for (let j = i + 1; j < numericCols.length; j++) {
        const colA = numericCols[i]
        const colB = numericCols[j]
        const gA = matchHeader(colA)
        const gB = matchHeader(colB)
        if (!gA || !gB) continue

        const srcA = sourceRows.map(r => parseNum(r[colA])).filter(n => !isNaN(n))
        const srcB = sourceRows.map(r => parseNum(r[colB])).filter(n => !isNaN(n))
        const genA = genRecords.map(r => parseNum(r[gA])).filter(n => !isNaN(n))
        const genB = genRecords.map(r => parseNum(r[gB])).filter(n => !isNaN(n))

        if (Math.min(srcA.length, srcB.length) < 3) continue
        srcCorrs.push(pearson(srcA, srcB))
        genCorrs.push(pearson(genA, genB))
      }
    }

    if (srcCorrs.length > 0) {
      const diffs = srcCorrs.map((c, i) => Math.abs(c - (genCorrs[i] ?? 0)))
      correlation = Math.max(0, 100 - (diffs.reduce((s, n) => s + n, 0) / diffs.length) * 100)
    }
  }

  const clamp = (n: number) => Math.round(Math.min(100, Math.max(0, n)))
  return {
    statistical:  clamp(statistical),
    distribution: clamp(distribution),
    correlation:  clamp(correlation),
    composite:    clamp(statistical * 0.4 + distribution * 0.4 + correlation * 0.2),
  }
}
