import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getCompetition, joinCompetition, cancelJoinCompetition } from '@/services/authApi'
import { useAuthStore } from '@/store/authStore'
import type { Competition, CompetitionStatus } from '@/types/auth'

const STATUS_LABEL: Record<CompetitionStatus, string> = {
  PREPARING: '준비 중',
  ONGOING:   '진행 중',
  FINISHED:  '종료',
  CANCELED:  '취소',
}
const STATUS_COLOR: Record<CompetitionStatus, string> = {
  PREPARING: 'bg-yellow-900 text-yellow-400',
  ONGOING:   'bg-green-900 text-green-400',
  FINISHED:  'bg-gray-800 text-gray-500',
  CANCELED:  'bg-red-900 text-red-400',
}

const fmt = (n: number) => n.toLocaleString('ko-KR')

export function CompetitionDetailPage() {
  const { id }            = useParams<{ id: string }>()
  const navigate          = useNavigate()
  const { token, user }   = useAuthStore()
  const [comp, setComp]   = useState<Competition | null>(null)
  const [loading, setLoading]   = useState(true)
  const [joining, setJoining]   = useState(false)
  const [joined,  setJoined]    = useState(false)
  const [nickname, setNickname] = useState('')
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getCompetition(id)
      .then(setComp)
      .catch(() => setError('대회 정보를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
    // 닉네임 초기값으로 사용자 이름 세팅
    if (user?.name) setNickname(user.name)
  }, [id, user?.name])

  const handleJoin = async () => {
    if (!id || !user) return
    setJoining(true)
    try {
      await joinCompetition(id, user.userId, nickname || user.name, token ?? undefined)
      setJoined(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '참가 실패')
    } finally {
      setJoining(false)
    }
  }

  const handleCancel = async () => {
    if (!id || !user) return
    try {
      await cancelJoinCompetition(id, user.userId, nickname || user.name, token ?? undefined)
      setJoined(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '취소 실패')
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-600">불러오는 중...</div>
  if (error || !comp) return <div className="text-center py-20 text-red-400">{error ?? '대회를 찾을 수 없습니다.'}</div>

  const canJoin = comp.status === 'PREPARING' || comp.status === 'ONGOING'

  return (
    <div className="max-w-screen-md mx-auto px-6 py-8">
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>
        목록으로
      </button>

      {/* 헤더 */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_COLOR[comp.status]}`}>
            {STATUS_LABEL[comp.status]}
          </span>
          <span className="text-xs text-gray-500">{comp.currentRegisters}명 참가 중</span>
        </div>
        <h1 className="text-xl font-bold text-gray-100 mb-2">{comp.name}</h1>
        <p className="text-sm text-gray-400 leading-relaxed">{comp.description}</p>

        <div className="grid grid-cols-2 gap-3 mt-5">
          {[
            ['대회 시작', comp.competitionStartAt?.slice(0, 10)],
            ['대회 종료', comp.competitionEndAt?.slice(0, 10)],
            ['신청 기간', `${comp.registerStartAt?.slice(0, 10)} ~ ${comp.registerEndAt?.slice(0, 10)}`],
            ['시작 자산', `${fmt(comp.firstSeed)}원`],
            ['최소 인원', `${comp.minParticipants}명`],
            ['최대 인원', `${comp.maxParticipants}명`],
          ].map(([label, value]) => (
            <div key={label} className="bg-gray-800 rounded-xl px-4 py-3">
              <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
              <p className="text-sm font-mono font-semibold text-gray-200">{value}</p>
            </div>
          ))}
        </div>

        {canJoin && !joined && (
          <div className="mt-5">
            <div className="mb-3">
              <label className="text-xs text-gray-400 mb-1.5 block">참가 닉네임</label>
              <input
                type="text" value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={user?.name ?? '닉네임'}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <button onClick={handleJoin} disabled={joining}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors disabled:opacity-50">
              {joining ? '참가 중...' : '대회 참가하기'}
            </button>
          </div>
        )}
        {joined && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-green-400 font-medium">✓ 참가 완료!</p>
            <button onClick={handleCancel}
              className="text-xs px-4 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 text-red-400 transition-colors">
              참가 취소
            </button>
          </div>
        )}
        {error && (
          <p className="mt-3 text-xs text-red-400 bg-red-950 border border-red-800 rounded-xl px-4 py-2.5">{error}</p>
        )}
      </div>

      {/* 랭킹 바로가기 */}
      <Link to={`/competitions/${id}/dashboard`}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-gray-700 text-sm text-gray-300 hover:border-indigo-600 hover:text-indigo-300 transition-colors">
        🏆 랭킹 보기
      </Link>
    </div>
  )
}
