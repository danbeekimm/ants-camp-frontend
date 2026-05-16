// 백엔드 시드 데이터에 빈/플레이스홀더/말이 안 되는 값이 섞여 있어 카드에 그대로
// 노출되는 경우가 있다. 표시 단에서 가드해 사용자가 의미 없는 더미 텍스트를 보지 않도록 한다.

const PLACEHOLDER_NAMES = new Set(['', '대회', '제목', '이름', 'TBD', 'tbd', '미정'])
const PLACEHOLDER_DESCS = new Set(['', '소개', '설명', 'TBD', 'tbd', '미정'])
const MIN_VALID_SEED    = 10_000 // 시드 1만원 미만은 더미로 간주

export const displayCompetitionName = (raw?: string | null): string => {
  const v = raw?.trim() ?? ''
  return PLACEHOLDER_NAMES.has(v) ? '(제목 미정)' : v
}

export const displayCompetitionDesc = (raw?: string | null): string => {
  const v = raw?.trim() ?? ''
  return PLACEHOLDER_DESCS.has(v) ? '' : v
}

export const displayCompetitionSeed = (n?: number | null): string => {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < MIN_VALID_SEED) return '—'
  return n.toLocaleString('ko-KR')
}
