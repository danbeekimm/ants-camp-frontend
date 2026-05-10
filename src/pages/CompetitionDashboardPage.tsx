import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCompetition, getCompetitionRankings } from '@/services/authApi'
import { useAuthStore } from '@/store/authStore'
import type { Competition, CompetitionRanking } from '@/types/auth'

const fmt = (n: number) => n.toLocaleString('ko-KR')

export function CompetitionDashboardPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [comp, setComp]         = useState<Competition | null>(null)
  const [rankings, setRankings] = useState<CompetitionRanking[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([getCompetition(id), getCompetitionRankings(id)])
      .then(([c, r]) => { setComp(c); setRankings(r) })
      .finally(() => setLoading(false))
  }, [id])

  const myRank = rankings.find((r) => r.userId === user?.userId)

  if (loading) return <div className="text-center py-20 text-gray-600">불러오는 중...</div>

  return (
    <div className="max-w-screen-md mx-auto px-6 py-8">
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 mb-4 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>
        대회 상세로
      </button>

      <h1 className="text-xl font-bold text-gray-100 mb-1">{comp?.name ?? '대회 랭킹'}</h1>
      <p className="text-xs text-gray-500 mb-6">{rankings.length}명 참가 중</p>

      {/* 내 순위 카드 */}
      {myRank && (
        <div className="bg-indigo-950 border border-indigo-700 rounded-2xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-indigo-400 mb-0.5">내 순위</p>
            <p className="text-2xl font-bold text-white">{myRank.rank}위</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-indigo-400 mb-0.5">총 자산</p>
            <p className="text-sm font-mono text-gray-200">{fmt(myRank.totalAsset)}원</p>
          </div>
        </div>
      )}

      {/* 랭킹 테이블 */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_130px] text-[10px] text-gray-500 font-medium px-5 py-3 border-b border-gray-800">
          <span>순위</span><span>참가자 ID</span><span className="text-right">총 자산</span>
        </div>
        {rankings.length === 0 ? (
          <p className="text-center py-10 text-gray-600 text-sm">아직 참가자가 없습니다.</p>
        ) : (
          rankings.map((r) => {
            const isMe  = r.userId === user?.userId
            const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : null
            return (
              <div key={r.userId}
                className={`grid grid-cols-[40px_1fr_130px] items-center px-5 py-3.5 border-b border-gray-800 last:border-0 ${
                  isMe ? 'bg-indigo-950/50' : 'hover:bg-gray-800/50'
                } transition-colors`}>
                <span className="text-sm font-bold text-gray-400">{medal ?? `${r.rank}`}</span>
                <span className={`text-xs font-mono truncate ${isMe ? 'text-indigo-300' : 'text-gray-400'}`}>
                  {r.userId.slice(0, 8)}…{isMe && <span className="text-[9px] text-indigo-400 ml-1">(나)</span>}
                </span>
                <span className="text-right text-xs font-mono text-gray-300">
                  {fmt(r.totalAsset)}원
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
