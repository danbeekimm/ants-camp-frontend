import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { getMyInfo, getMyRankingHistory, getCompetition } from '@/services/authApi'
import type { MyRankingHistory, Competition } from '@/types/auth'

const ROLE_LABEL: Record<string, string> = {
  ADMIN:   '관리자',
  MANAGER: '매니저',
  PLAYER:  '일반 회원',
}

const RANK_TIER_LABEL: Record<string, { label: string; emoji: string; color: string }> = {
  RANK_1: { label: '1위',  emoji: '🥇', color: 'text-yellow-400' },
  RANK_2: { label: '2위',  emoji: '🥈', color: 'text-gray-300'  },
  RANK_3: { label: '3위',  emoji: '🥉', color: 'text-amber-600' },
}

function getRankDisplay(tier: string) {
  if (RANK_TIER_LABEL[tier]) return RANK_TIER_LABEL[tier]
  const num = tier.replace('RANK_', '')
  return { label: `${num}위`, emoji: '🏅', color: 'text-indigo-400' }
}

function fmtDate(iso: string) {
  return iso.slice(0, 10).replace(/-/g, '.')
}

interface HistoryWithComp extends MyRankingHistory {
  competitionName?: string
  competitionStatus?: string
}

export function MyPage() {
  const { user, token, setAuth } = useAuthStore()
  const [refreshing, setRefreshing]   = useState(false)
  const [history,    setHistory]      = useState<HistoryWithComp[]>([])
  const [histLoading, setHistLoading] = useState(false)

  // 내 정보 갱신
  useEffect(() => {
    if (!user || !token) return
    setRefreshing(true)
    getMyInfo(user.userId, token)
      .then((fresh) => setAuth(fresh, token))
      .catch(() => {})
      .finally(() => setRefreshing(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 참여 대회 이력 로드
  useEffect(() => {
    if (!user) return
    setHistLoading(true)
    getMyRankingHistory()
      .then(async (items) => {
        // 대회명 병렬 조회
        const enriched = await Promise.all(
          items.map(async (item) => {
            try {
              const comp = await getCompetition(item.competitionId)
              return { ...item, competitionName: comp.name, competitionStatus: comp.status }
            } catch {
              return item
            }
          })
        )
        // 최근 순 정렬
        enriched.sort((a, b) =>
          new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
        )
        setHistory(enriched)
      })
      .catch(() => {})
      .finally(() => setHistLoading(false))
  }, [user])

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8">
      {/* 프로필 카드 */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-700 flex items-center justify-center text-xl font-bold text-white">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-100 text-lg">{user?.name}</p>
              {refreshing && (
                <span className="text-[10px] text-gray-600 animate-pulse">갱신 중…</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
            <p className="text-xs text-gray-600 mt-0.5">{user?.phone}</p>
            <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-900 text-indigo-300">
              {ROLE_LABEL[user?.role ?? ''] ?? user?.role ?? '일반 회원'}
            </span>
          </div>
        </div>
        <Link
          to="/mypage/edit"
          className="text-xs px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:border-indigo-600 hover:text-indigo-300 transition-colors"
        >
          정보 수정
        </Link>
      </div>

      {/* 바로가기 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link
          to="/portfolio"
          className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center hover:border-indigo-700 transition-colors"
        >
          <p className="text-2xl mb-2">📊</p>
          <p className="text-sm font-bold text-gray-200">포트폴리오</p>
          <p className="text-xs text-gray-600 mt-1">보유 자산 확인</p>
        </Link>
        <Link
          to="/stock"
          className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center hover:border-indigo-700 transition-colors"
        >
          <p className="text-2xl mb-2">📈</p>
          <p className="text-sm font-bold text-gray-200">주식 차트</p>
          <p className="text-xs text-gray-600 mt-1">실시간 시세 · 주문</p>
        </Link>
      </div>

      {/* 참여 대회 이력 */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-gray-200 mb-4">🏆 참여 대회 이력</h2>

        {histLoading ? (
          <p className="text-xs text-gray-600 text-center py-6 animate-pulse">불러오는 중…</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-6">참여한 대회가 없어요.</p>
        ) : (
          <div className="space-y-3">
            {history.map((item) => {
              const rank = getRankDisplay(item.rankTier)
              return (
                <Link
                  key={item.competitionId}
                  to={`/competitions/${item.competitionId}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-950 border border-gray-800 hover:border-indigo-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{rank.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-100">
                        {item.competitionName ?? '대회'}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {fmtDate(item.lastUpdatedAt)} 기준
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold font-mono ${rank.color}`}>
                    {rank.label}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
