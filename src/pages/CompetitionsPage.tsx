import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Users, Coins, Clock } from 'lucide-react'
import { getCompetitions, getCompetitionRankings, getParticipants } from '@/services/authApi'
import { PageSpinner, PageError } from '@/components/ui/Spinner'
import { useThemeStore } from '@/store/themeStore'
import { displayCompetitionName, displayCompetitionDesc, displayCompetitionSeed } from '@/utils/competition'
import type { Competition, CompetitionStatus, CompetitionRanking } from '@/types/auth'

const STATUS_LABEL: Record<CompetitionStatus, string> = {
  PREPARING: '준비 중', ONGOING: '진행 중', FINISHED: '종료', CANCELED: '취소',
}
const STATUS_CHIP: Record<CompetitionStatus, string> = {
  PREPARING: 'chip chip-amber chip-dot',
  ONGOING:   'chip chip-emerald chip-dot',
  FINISHED:  'chip chip-gray',
  CANCELED:  'chip chip-rose chip-dot',
}
// 카드 상단 액센트 스트립 색상 (상태별)
const STATUS_STRIP: Record<CompetitionStatus, string> = {
  PREPARING: 'var(--amber)',
  ONGOING:   'var(--emerald)',
  FINISHED:  'var(--gray-700)',
  CANCELED:  'var(--rose)',
}
const MEDALS = ['🥇', '🥈', '🥉']

const fmt     = (n: number) => n.toLocaleString('ko-KR')
const fmtDate = (dt: string) => dt ? dt.slice(0, 10).replace(/-/g, '.') : ''


function getDDay(comp: Competition): { label: string; chip: string } | null {
  const now = Date.now()
  if (comp.status === 'ONGOING') {
    const days = Math.ceil((new Date(comp.competitionEndAt).getTime() - now) / 86400000)
    return { label: days <= 0 ? '오늘 종료' : `D-${days} 종료`, chip: 'chip chip-amber' }
  }
  if (comp.status === 'PREPARING') {
    const days = Math.ceil((new Date(comp.competitionStartAt).getTime() - now) / 86400000)
    if (days <= 0)  return { label: 'D-DAY', chip: 'chip chip-indigo' }
    if (days <= 60) return { label: `D-${days}`, chip: 'chip chip-indigo' }
  }
  return null
}

export function CompetitionsPage() {
  const { isDark } = useThemeStore()

  const [all, setAll]         = useState<Competition[]>([])
  const [status, setStatus]   = useState<CompetitionStatus | ''>('')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // ONGOING 대회의 TOP 3 랭킹 (competitionId → top3 + 참가자 username 맵)
  const [topRankings, setTopRankings] = useState<Map<string, CompetitionRanking[]>>(new Map())
  const [nameMap, setNameMap]         = useState<Map<string, Map<string, string>>>(new Map())

  useEffect(() => {
    getCompetitions({ size: 100 })
      .then((list) => {
        setAll(list)
        const ongoing = list.filter((c) => c.status === 'ONGOING')
        Promise.all(
          ongoing.map((c) =>
            Promise.all([
              getCompetitionRankings(c.competitionId, 0, 3).catch(() => [] as CompetitionRanking[]),
              getParticipants(c.competitionId).catch(() => []),
            ]).then(([ranks, parts]) => {
              const m = new Map<string, string>()
              parts.forEach((p) => { if (p.username) m.set(p.userId, p.username) })
              return [c.competitionId, ranks.slice(0, 3), m] as const
            }),
          ),
        ).then((results) => {
          const rankMap = new Map<string, CompetitionRanking[]>()
          const nm      = new Map<string, Map<string, string>>()
          results.forEach(([id, ranks, m]) => {
            if (ranks.length) rankMap.set(id, ranks)
            nm.set(id, m)
          })
          setTopRankings(rankMap)
          setNameMap(nm)
        })
      })
      .catch(() => setError('대회 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [])

  const competitions = useMemo(
    () => status ? all.filter((c) => c.status === status) : all,
    [all, status],
  )

  const counts = useMemo(() => {
    const c: Partial<Record<CompetitionStatus, number>> = {}
    all.forEach((comp) => { c[comp.status] = (c[comp.status] ?? 0) + 1 })
    return c
  }, [all])

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8">
      {/* 헤더 */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">대회 목록</h1>
          <p className="text-sm text-gray-500 mt-1">참여할 주식 모의투자 대회를 찾아보세요</p>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="kicker">TOTAL</span>
          <span className="text-base font-mono font-bold text-gray-100">{all.length}</span>
          <span className="text-xs text-gray-500">개</span>
        </div>
      </div>

      {/* 필터 — 카운트는 회색 칩 대신 인라인 텍스트로 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['', 'PREPARING', 'ONGOING', 'FINISHED', 'CANCELED'] as const).map((s) => {
          const count  = s === '' ? all.length : (counts[s] ?? 0)
          const active = status === s
          return (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-xl transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-900 border border-gray-800 text-gray-400 hover:border-indigo-500 hover:text-indigo-400'
              }`}
            >
              {s === '' ? '전체' : STATUS_LABEL[s]}
              {count > 0 && (
                <span className={`text-[10px] font-mono ${active ? 'text-white/75' : 'text-gray-500'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {loading ? (
        <PageSpinner />
      ) : error ? (
        <PageError message={error} />
      ) : competitions.length === 0 ? (
        <div
          className="relative overflow-hidden rounded-2xl px-6 py-14 text-center"
          style={isDark
            ? { background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)' }
            : { background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 60%, #eef2ff 100%)', border: '1px solid #e5e7eb' }}
        >
          <div
            className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none"
            style={{ background: isDark
              ? 'radial-gradient(circle, rgba(251,191,36,0.18), transparent 70%)'
              : 'radial-gradient(circle, rgba(251,191,36,0.22), transparent 70%)' }}
          />
          <div className="relative z-10 flex flex-col items-center gap-2.5">
            <Trophy className="w-10 h-10" style={{ color: isDark ? '#fbbf24' : '#d97706' }} />
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: isDark ? '#fff' : '#111827' }}>
                {status ? `${STATUS_LABEL[status]} 대회가 없습니다` : '등록된 대회가 없습니다'}
              </p>
              <p className="text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.55)' : '#6b7280' }}>
                곧 새로운 대회가 열릴 예정입니다
              </p>
            </div>
            {status && (
              <button
                onClick={() => setStatus('')}
                className="mt-3 text-xs font-semibold px-5 py-2 rounded-xl transition-colors"
                style={isDark
                  ? { background: '#fff', color: '#0f172a' }
                  : { background: '#4f46e5', color: '#fff' }}
              >
                전체 대회 보기
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {competitions.map((c) => {
            const dday = getDDay(c)
            const top3 = topRankings.get(c.competitionId) ?? []
            return (
              <Link
                key={c.competitionId}
                to={`/competitions/${c.competitionId}`}
                className="row-card group relative bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col"
              >
                {/* 상태별 상단 액센트 스트립 */}
                <div
                  className="h-1"
                  style={{ background: `linear-gradient(90deg, ${STATUS_STRIP[c.status]}, transparent)` }}
                />

                <div className="p-5 flex flex-col flex-1">
                  {/* 상단: 상태 + 디데이 */}
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <span className={STATUS_CHIP[c.status]}>{STATUS_LABEL[c.status]}</span>
                    {dday && (
                      <span className={`${dday.chip} inline-flex items-center gap-1`}>
                        <Clock className="w-2.5 h-2.5" />
                        {dday.label}
                      </span>
                    )}
                  </div>

                  {/* 제목 + 설명 — 더미/플레이스홀더 데이터 가드 */}
                  <h3 className="font-bold text-gray-100 text-sm mb-1 leading-snug group-hover:text-indigo-400 transition-colors line-clamp-2">
                    {displayCompetitionName(c.name)}
                  </h3>
                  {displayCompetitionDesc(c.description) && (
                    <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed">{displayCompetitionDesc(c.description)}</p>
                  )}

                  {/* 메타 인라인 — 회색 박스 없이 점/디바이더로 분리 */}
                  <div className="flex items-center gap-3 text-[11px] mb-3 flex-wrap">
                    <div className="inline-flex items-center gap-1.5">
                      <Coins className="w-3 h-3 text-indigo-400" />
                      <span className="font-mono font-semibold text-gray-200">{displayCompetitionSeed(c.firstSeed)}</span>
                      <span className="text-gray-500">원</span>
                    </div>
                    <span className="w-px h-3 bg-gray-700" />
                    <div className="inline-flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-gray-500" />
                      <span className="font-mono text-gray-300">{c.currentRegisters}</span>
                      <span className="text-gray-500">명</span>
                    </div>
                  </div>

                  {/* TOP 3 (ONGOING 한정) — 인라인 리스트 */}
                  {c.status === 'ONGOING' && (
                    <div className="border-t border-gray-800 pt-3 mt-1 mb-3">
                      <p className="kicker mb-2" style={{ fontSize: '9px' }}>LEADERBOARD</p>
                      {top3.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {top3.map((r, i) => {
                            const name = r.username || nameMap.get(c.competitionId)?.get(r.userId) || '참가자'
                            return (
                              <div key={r.userId} className="flex items-center gap-2 text-[11px]">
                                <span className="text-sm leading-none flex-shrink-0 w-4">{MEDALS[i]}</span>
                                <span className="flex-1 truncate text-gray-300 min-w-0">{name}</span>
                                <span className="font-mono text-gray-400 flex-shrink-0">{fmt(r.totalAsset ?? 0)}원</span>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-500 text-center py-1">순위 집계 중…</p>
                      )}
                    </div>
                  )}

                  {/* 기간 */}
                  <div className="text-[10px] font-mono text-gray-500 mt-auto pt-2">
                    {fmtDate(c.competitionStartAt)} → {fmtDate(c.competitionEndAt)}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
