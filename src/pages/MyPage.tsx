import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { getMyInfo } from '@/services/authApi'

const ROLE_LABEL: Record<string, string> = {
  ADMIN:   '관리자',
  MANAGER: '매니저',
  PLAYER:  '일반 회원',
}

export function MyPage() {
  const { user, token, setAuth } = useAuthStore()

  const [refreshing, setRefreshing] = useState(false)

  // 마운트 시 서버에서 최신 사용자 정보 조회 + authStore 업데이트
  useEffect(() => {
    if (!user || !token) return
    setRefreshing(true)
    getMyInfo(user.userId, token)
      .then((fresh) => {
        // 서버 최신 정보로 스토어 갱신 (토큰은 유지)
        setAuth(fresh, token)
      })
      .catch(() => { /* 네트워크 실패 시 캐시 데이터 유지 */ })
      .finally(() => setRefreshing(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="grid grid-cols-2 gap-3">
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
    </div>
  )
}