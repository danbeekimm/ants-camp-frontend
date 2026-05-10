import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function MyPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  // 계좌 ID 직접 입력 → 계좌 상세로 이동
  const [accountId, setAccountId] = useState(localStorage.getItem('lastAccountId') ?? '')

  const handleGoAccount = () => {
    const id = accountId.trim()
    if (!id) return
    localStorage.setItem('lastAccountId', id)
    navigate(`/account/${id}`)
  }

  return (
    <div className="max-w-screen-md mx-auto px-6 py-8">
      {/* 프로필 카드 */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-700 flex items-center justify-center text-xl font-bold text-white">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div>
            <p className="font-bold text-gray-100 text-lg">{user?.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
            <p className="text-xs text-gray-600 mt-0.5">{user?.phone}</p>
            <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-900 text-indigo-300">
              {user?.role === 'ADMIN' ? '관리자' : user?.role === 'MANAGER' ? '매니저' : '일반 회원'}
            </span>
          </div>
        </div>
        <Link to="/mypage/edit"
          className="text-xs px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:border-indigo-600 hover:text-indigo-300 transition-colors">
          정보 수정
        </Link>
      </div>

      {/* 계좌 조회 */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-bold text-gray-300 mb-1">계좌 조회</h2>
        <p className="text-xs text-gray-600 mb-4">계좌 ID를 입력하면 잔고·보유 종목을 확인할 수 있습니다.</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGoAccount()}
            placeholder="계좌 UUID"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm font-mono text-gray-100 placeholder-gray-600 outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            onClick={handleGoAccount}
            disabled={!accountId.trim()}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
            조회
          </button>
        </div>
      </div>

      {/* 포트폴리오 / 주식 차트 바로가기 */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/portfolio"
          className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center hover:border-indigo-700 transition-colors">
          <p className="text-2xl mb-2">📊</p>
          <p className="text-sm font-bold text-gray-200">포트폴리오</p>
          <p className="text-xs text-gray-600 mt-1">보유 자산 확인</p>
        </Link>
        <Link to="/stock"
          className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center hover:border-indigo-700 transition-colors">
          <p className="text-2xl mb-2">📈</p>
          <p className="text-sm font-bold text-gray-200">주식 차트</p>
          <p className="text-xs text-gray-600 mt-1">실시간 시세 · 주문</p>
        </Link>
      </div>
    </div>
  )
}
