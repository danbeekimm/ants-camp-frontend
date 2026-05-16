import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Trophy, Users, Crown, Sparkles } from 'lucide-react'
import { getCompetition, getCompetitionRankings, getParticipants } from '@/services/authApi'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { PageSpinner } from '@/components/ui/Spinner'
import type { Competition, CompetitionRanking } from '@/types/auth'

// ── Top 3 호화 카드 톤 ─ 라이트/다크 분리 ────────────────────────────────────
interface LuxToken {
  bg:        string
  border:    string
  glow1:     string
  glow2:     string
  label:     string         // 'CHAMPION' / 'RUNNER-UP' / '3RD PLACE'
  labelCol:  string         // 라벨 색
  title:     string         // 메인 텍스트
  dim:       string         // 라벨/단위
  badge:     string         // 메달 박스 배경
  badgeShdw: string         // 메달 박스 글로우
  rankCol:   string         // 큰 등수 숫자 색
}

// 채도 낮춘 깊은 베이스 + 금속 액센트는 보더/메달/라벨/은은한 글로우에만
function getLuxToken(rank: 1 | 2 | 3, isDark: boolean): LuxToken {
  if (rank === 1) {
    // GOLD — 처음(쨍함)과 톤다운 중간: 따뜻한 다크 앰버 / 옅은 샴페인
    return isDark
      ? {
          bg:        'linear-gradient(135deg, #1f160e 0%, #312112 55%, #1f160e 100%)',
          border:    '1px solid rgba(217,119,6,0.60)',
          glow1:     'radial-gradient(circle, rgba(251,191,36,0.28), transparent 70%)',
          glow2:     'radial-gradient(circle, rgba(217,119,6,0.16), transparent 70%)',
          label:     'CHAMPION',
          labelCol:  '#fbd56e',
          title:     '#fef3c7',
          dim:       'rgba(251,213,110,0.62)',
          badge:     'linear-gradient(135deg, #fde68a 0%, #b45309 100%)',
          badgeShdw: '0 0 22px rgba(251,191,36,0.48)',
          rankCol:   '#fbd56e',
        }
      : {
          bg:        'linear-gradient(135deg, #fdf8e5 0%, #f5e4b8 55%, #ead29c 100%)',
          border:    '1px solid #b8842d',
          glow1:     'radial-gradient(circle, rgba(217,119,6,0.22), transparent 70%)',
          glow2:     'radial-gradient(circle, rgba(180,83,9,0.10),  transparent 70%)',
          label:     'CHAMPION',
          labelCol:  '#92400e',
          title:     '#5a2403',
          dim:       '#7a3306',
          badge:     'linear-gradient(135deg, #fde68a 0%, #b45309 100%)',
          badgeShdw: '0 0 18px rgba(217,119,6,0.42)',
          rankCol:   '#7a3306',
        }
  }
  if (rank === 2) {
    // SILVER / PLATINUM — 차분한 슬레이트 베이스
    return isDark
      ? {
          bg:        'linear-gradient(135deg, #14171c 0%, #1c2027 55%, #14171c 100%)',
          border:    '1px solid rgba(148,163,184,0.42)',
          glow1:     'radial-gradient(circle, rgba(203,213,225,0.13), transparent 70%)',
          glow2:     'radial-gradient(circle, rgba(148,163,184,0.08), transparent 70%)',
          label:     'RUNNER-UP',
          labelCol:  '#cbd5e1',
          title:     '#f1f5f9',
          dim:       'rgba(203,213,225,0.55)',
          badge:     'linear-gradient(135deg, #f1f5f9 0%, #64748b 100%)',
          badgeShdw: '0 0 18px rgba(148,163,184,0.32)',
          rankCol:   '#e2e8f0',
        }
      : {
          bg:        'linear-gradient(135deg, #f8fafc 0%, #eef1f5 55%, #dee3ea 100%)',
          border:    '1px solid #94a3b8',
          glow1:     'radial-gradient(circle, rgba(148,163,184,0.16), transparent 70%)',
          glow2:     'radial-gradient(circle, rgba(100,116,139,0.06), transparent 70%)',
          label:     'RUNNER-UP',
          labelCol:  '#475569',
          title:     '#0f172a',
          dim:       '#64748b',
          badge:     'linear-gradient(135deg, #f1f5f9 0%, #64748b 100%)',
          badgeShdw: '0 0 14px rgba(100,116,139,0.28)',
          rankCol:   '#1e293b',
        }
  }
  // rank === 3 — BRONZE / COPPER
  return isDark
    ? {
        bg:        'linear-gradient(135deg, #15110d 0%, #1f1812 55%, #15110d 100%)',
        border:    '1px solid rgba(194,65,12,0.42)',
        glow1:     'radial-gradient(circle, rgba(251,146,60,0.14), transparent 70%)',
        glow2:     'radial-gradient(circle, rgba(194,65,12,0.07),  transparent 70%)',
        label:     '3RD PLACE',
        labelCol:  '#f4a672',
        title:     '#ffedd5',
        dim:       'rgba(244,166,114,0.55)',
        badge:     'linear-gradient(135deg, #fed7aa 0%, #9a3412 100%)',
        badgeShdw: '0 0 18px rgba(194,65,12,0.32)',
        rankCol:   '#f4a672',
      }
    : {
        bg:        'linear-gradient(135deg, #fbf6f0 0%, #f3e6d3 55%, #ead4b6 100%)',
        border:    '1px solid #b8763b',
        glow1:     'radial-gradient(circle, rgba(194,65,12,0.12), transparent 70%)',
        glow2:     'radial-gradient(circle, rgba(154,52,18,0.06), transparent 70%)',
        label:     '3RD PLACE',
        labelCol:  '#9a3412',
        title:     '#431407',
        dim:       '#7c2d12',
        badge:     'linear-gradient(135deg, #fed7aa 0%, #9a3412 100%)',
        badgeShdw: '0 0 14px rgba(154,52,18,0.28)',
        rankCol:   '#9a3412',
      }
}

const fmt = (n: number) => n.toLocaleString('ko-KR')

// 1·2·3위 메달 톤 — MainPage RANK_BADGE 와 동일 팔레트
const PODIUM = [
  { medal: '🥇', accent: '#f59e0b', soft: 'rgba(251,191,36,0.18)', shadow: '0 0 12px rgba(251,191,36,0.35)' },
  { medal: '🥈', accent: '#94a3b8', soft: 'rgba(148,163,184,0.18)', shadow: '0 0 10px rgba(148,163,184,0.25)' },
  { medal: '🥉', accent: '#ea580c', soft: 'rgba(234,88,12,0.18)',  shadow: '0 0 10px rgba(234,88,12,0.3)' },
] as const

export function CompetitionDashboardPage() {
  const { id }     = useParams<{ id: string }>()
  const { user }   = useAuthStore()
  const { isDark } = useThemeStore()

  const [comp, setComp]         = useState<Competition | null>(null)
  const [rankings, setRankings] = useState<CompetitionRanking[]>([])
  const [nameByUserId, setNameByUserId] = useState<Map<string, string>>(new Map())
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      getCompetition(id),
      getCompetitionRankings(id),
      getParticipants(id).catch(() => []),
    ])
      .then(([c, r, parts]) => {
        setComp(c)
        setRankings(r)
        const map = new Map<string, string>()
        parts.forEach((p) => { if (p.username) map.set(p.userId, p.username) })
        setNameByUserId(map)
      })
      .finally(() => setLoading(false))
  }, [id])

  const getName = (r: CompetitionRanking) => r.username || nameByUserId.get(r.userId)

  // firstSeed 기반 수익률
  const profitOf = (r: CompetitionRanking) =>
    comp && comp.firstSeed > 0 ? ((r.totalAsset - comp.firstSeed) / comp.firstSeed) * 100 : 0

  const myRank   = rankings.find((r) => r.userId === user?.userId)
  const myProfit = myRank ? profitOf(myRank) : 0
  const myUp     = myProfit >= 0

  if (loading) return <PageSpinner />

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8">
      <Link
        to={`/competitions/${id}`}
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-200 mb-5 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        대회 상세로
      </Link>

      {/* 헤더 */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="kicker mb-1">RANKING</p>
          <h1 className="text-xl font-bold text-gray-100">{comp?.name ?? '대회 랭킹'}</h1>
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs text-gray-500">
          <Users className="w-3.5 h-3.5" />
          <span className="font-mono font-bold text-gray-300">{rankings.length}</span>
          명 참가
        </div>
      </div>

      {/* 내 순위 카드 — Top 3 호화 / 4위 이하 인디고 액센트 */}
      {myRank && (myRank.rank >= 1 && myRank.rank <= 3 ? (
        (() => {
          const t      = getLuxToken(myRank.rank as 1 | 2 | 3, isDark)
          const isOne  = myRank.rank === 1
          return (
            <div
              className={`relative overflow-hidden rounded-2xl p-6 mb-6 ${isOne ? 'lux-card' : ''}`}
              style={{ background: t.bg, border: t.border }}
            >
              {/* 듀얼 글로우 */}
              <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full pointer-events-none" style={{ background: t.glow1 }} />
              <div className="absolute -left-16 -bottom-16 w-56 h-56 rounded-full pointer-events-none" style={{ background: t.glow2 }} />

              {/* 1위 전용 스파클 — 미세하게 */}
              {isOne && (
                <>
                  <Sparkles className="absolute top-5 right-7 w-3 h-3 animate-pulse pointer-events-none opacity-45" style={{ color: t.labelCol, animationDuration: '3.2s' }} />
                  <Sparkles className="absolute bottom-6 right-16 w-2.5 h-2.5 animate-pulse pointer-events-none opacity-35" style={{ color: t.labelCol, animationDelay: '1.2s', animationDuration: '3.6s' }} />
                </>
              )}

              <div className="relative z-10">
                {/* 상단 레이블 */}
                <div className="flex items-center gap-1.5 mb-4">
                  {isOne
                    ? <Crown className="w-4 h-4" style={{ color: t.labelCol }} strokeWidth={2.4} />
                    : <Trophy className="w-3.5 h-3.5" style={{ color: t.labelCol }} strokeWidth={2.4} />}
                  <span
                    className="text-[11px] font-bold tracking-[0.2em]"
                    style={{ color: t.labelCol }}
                  >
                    {t.label}
                  </span>
                </div>

                {/* 본문: 메달 + 등수 + 자산 + 수익률 */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    {/* 메달 배지 — 정적 글로우 */}
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                      style={{ background: t.badge, boxShadow: t.badgeShdw }}
                    >
                      {['🥇', '🥈', '🥉'][myRank.rank - 1]}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-widest mb-0.5" style={{ color: t.dim }}>
                        내 순위
                      </p>
                      <p className="text-5xl font-bold tracking-tight leading-none font-mono" style={{ color: t.rankCol }}>
                        {myRank.rank}
                        <span className="text-2xl ml-1 font-semibold" style={{ color: t.dim }}>위</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-x-5 gap-y-2 flex-wrap">
                    <div className="text-right">
                      <p className="text-[10px] font-bold tracking-widest mb-0.5" style={{ color: t.dim }}>총 자산</p>
                      <p className="text-lg font-mono font-bold" style={{ color: t.title }}>
                        {fmt(myRank.totalAsset)}
                        <span className="text-xs ml-0.5" style={{ color: t.dim }}>원</span>
                      </p>
                    </div>
                    {comp && comp.firstSeed > 0 && (
                      <>
                        <div className="h-8 w-px" style={{ background: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }} />
                        <div className="text-right">
                          <p className="text-[10px] font-bold tracking-widest mb-0.5" style={{ color: t.dim }}>수익률</p>
                          <p
                            className="text-lg font-mono font-bold"
                            style={{ color: myUp ? (isDark ? '#fca5a5' : '#dc2626') : (isDark ? '#93c5fd' : '#2563eb') }}
                          >
                            {myUp ? '▲' : '▼'} {myUp ? '+' : ''}{myProfit.toFixed(2)}%
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })()
      ) : (
        <div
          className="relative overflow-hidden rounded-2xl p-5 mb-6"
          style={{
            background: 'linear-gradient(135deg, var(--accent-soft) 0%, var(--violet-soft) 100%)',
            border:     '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
          }}
        >
          <div
            className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-40 pointer-events-none"
            style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }}
          />
          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="kicker mb-1" style={{ color: 'var(--accent-text)' }}>내 순위</p>
              <p className="text-4xl font-bold tracking-tight leading-none" style={{ color: 'var(--accent-text)' }}>
                {myRank.rank}<span className="text-xl ml-1 font-semibold opacity-80">위</span>
              </p>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-right">
                <p className="kicker mb-1" style={{ color: 'var(--accent-text)' }}>총 자산</p>
                <p className="text-base font-mono font-bold" style={{ color: 'var(--accent-text)' }}>
                  {fmt(myRank.totalAsset)}<span className="text-xs ml-0.5 opacity-70">원</span>
                </p>
              </div>
              {comp && comp.firstSeed > 0 && (
                <div className="text-right">
                  <p className="kicker mb-1" style={{ color: 'var(--accent-text)' }}>수익률</p>
                  <p
                    className="text-base font-mono font-bold"
                    style={{ color: myUp ? '#ef4444' : '#3b82f6' }}
                  >
                    {myUp ? '▲' : '▼'} {myUp ? '+' : ''}{myProfit.toFixed(2)}%
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* 랭킹 리스트 */}
      {rankings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-800 px-6 py-10 text-center">
          <Trophy className="w-8 h-8 mx-auto mb-2 text-gray-500" />
          <p className="text-sm text-gray-400">아직 참가자가 없습니다</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rankings.map((r) => {
            const isMe    = r.userId === user?.userId
            const podium  = r.rank >= 1 && r.rank <= 3 ? PODIUM[r.rank - 1] : null
            const name    = getName(r)
            const display = isMe
              ? `${name ?? user?.name ?? user?.email ?? '나'} (나)`
              : (name ?? `참가자 ${r.rank}`)
            const profit  = profitOf(r)
            const profitUp = profit >= 0

            return (
              <div
                key={r.userId}
                className="row-card rounded-2xl px-4 py-3 flex items-center gap-3"
                style={isMe
                  ? { background: 'var(--accent-soft)', border: '1px solid color-mix(in srgb, var(--accent) 40%, transparent)' }
                  : podium
                    ? { background: 'var(--gray-900)', border: `1px solid color-mix(in srgb, ${podium.accent} 35%, var(--gray-800))` }
                    : { background: 'var(--gray-900)', border: '1px solid var(--gray-800)' }}
              >
                {/* 순위 / 메달 */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={podium
                    ? { background: podium.soft, boxShadow: podium.shadow }
                    : isMe
                      ? { background: 'color-mix(in srgb, var(--accent) 22%, transparent)' }
                      : { background: 'var(--accent-soft)' }}
                >
                  {podium ? (
                    <span className="text-xl leading-none">{podium.medal}</span>
                  ) : (
                    <span className="font-mono font-bold text-sm" style={{ color: 'var(--accent-text)' }}>
                      {r.rank}
                    </span>
                  )}
                </div>

                {/* 이름 + 수익률 */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm truncate"
                    style={isMe
                      ? { color: 'var(--accent-text)', fontWeight: 600 }
                      : podium
                        ? { color: 'var(--gray-100)', fontWeight: 600 }
                        : { color: 'var(--gray-200)' }}
                  >
                    {display}
                  </p>
                  {comp && comp.firstSeed > 0 && (
                    <p
                      className={`text-[11px] font-mono mt-0.5 ${
                        profitUp ? 'text-red-500 dark:text-red-400' : 'text-blue-500 dark:text-blue-400'
                      }`}
                    >
                      {profitUp ? '▲' : '▼'} {profitUp ? '+' : ''}{profit.toFixed(2)}%
                    </p>
                  )}
                </div>

                {/* 자산 */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-mono font-bold text-gray-100">
                    {fmt(r.totalAsset)}
                    <span className="text-[10px] text-gray-500 ml-0.5">원</span>
                  </p>
                </div>

                {isMe && <span className="chip chip-indigo">나</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
