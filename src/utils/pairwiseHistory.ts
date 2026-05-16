export const PAIRWISE_HISTORY_KEY = 'pairwise:history'
const MAX_HISTORY = 10

export interface PairwiseHistoryItem {
  runIdA: string
  runIdB: string
  ragModelA: string
  ragModelB: string
  memoA: string | null
  memoB: string | null
  savedAt: string
}

export function loadPairwiseHistory(): PairwiseHistoryItem[] {
  try { return JSON.parse(localStorage.getItem(PAIRWISE_HISTORY_KEY) ?? '[]') } catch { return [] }
}

export function savePairwiseHistory(item: PairwiseHistoryItem) {
  const prev = loadPairwiseHistory().filter(
    (h) => !(h.runIdA === item.runIdA && h.runIdB === item.runIdB),
  )
  localStorage.setItem(PAIRWISE_HISTORY_KEY, JSON.stringify([item, ...prev].slice(0, MAX_HISTORY)))
}
