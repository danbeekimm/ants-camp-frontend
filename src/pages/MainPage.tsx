import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCompetitions } from '@/services/authApi'
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

function fmtDate(dt: string) {
  return dt ? dt.slice(0, 10) : ''
}

export function MainPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [status, setStatus]             = useState<CompetitionStatus | ''>('')
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)

  const fetchList = async () => {
    setLoading(true); setError(null)
    try {
      const data = await getCompetitions({ status: status || undefined, size: 50 })
      setCompetitions(data)
    } catch {
      setError('대회 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchList() }, [status])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-screen-lg mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">대회 목록</h1>
        <p className="text-sm text-gray-500 mt-1">참여할 주식 모의투자 대회를 찾아보세요</p>
      </div>

      {/* 상태 필터 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['', 'PREPARING', 'ONGOING', 'FINISHED', 'CANCELED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`text-xs px-4 py-2 rounded-xl transition-colors ${
              status === s
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-900 border border-gray-700 text-gray-400 hover:border-indigo-600 hover:text-indigo-300'
            }`}
          >
            {s === '' ? '전체' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-600">불러오는 중...</div>
      ) : error ? (
        <div className="text-center py-20 text-red-400">{error}</div>
      ) : competitions.length === 0 ? (
        <div className="text-center py-20 text-gray-600">대회가 없습니다.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {competitions.map((c) => (
            <Link
              key={c.competitionId}
              to={`/competitions/${c.competitionId}`}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-indigo-700 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[c.status]}`}>
                  {STATUS_LABEL[c.status]}
                </span>
                <span className="text-[10px] text-gray-600">{c.currentRegisters}명 참가</span>
              </div>
              <h3 className="font-bold text-gray-100 text-sm mb-1 group-hover:text-indigo-300 transition-colors line-clamp-2">
                {c.name}
              </h3>
              <p className="text-xs text-gray-500 mb-4 line-clamp-2">{c.description}</p>
              <div className="flex items-center justify-between text-[10px] text-gray-600 font-mono">
                <span>{fmtDate(c.competitionStartAt)} ~ {fmtDate(c.competitionEndAt)}</span>
                <span className="text-indigo-400">{fmt(c.firstSeed)}원 시작</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
