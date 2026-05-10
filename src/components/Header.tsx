import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { logout as logoutApi } from '@/services/authApi'

export function Header() {
  const { isLoggedIn, isAdmin, logout, user } = useAuthStore()
  const { isDark, toggle } = useThemeStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    if (refreshToken) {
      try { await logoutApi(refreshToken) } catch { /* 서버 오류여도 로컬 정리는 진행 */ }
    }
    logout()
    navigate('/login')
  }

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/')

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
        isActive(to)
          ? 'bg-indigo-700 text-white'
          : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <header className="sticky top-0 z-50 bg-gray-950 border-b border-gray-800 px-6 py-3">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4">

        {/* ── 로고 + 메인 이동 ──────────────────────────────── */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" viewBox="0 0 24 24">
              <path d="M3 17l6-6 4 4 8-8" />
            </svg>
          </div>
          <span className="font-bold text-gray-100 text-sm tracking-wide">AntsCamp</span>
        </Link>

        {/* ── 네비게이션 ────────────────────────────────────── */}
        {isLoggedIn && (
          <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
            {navLink('/', '대회')}
            {navLink('/stock', '주식차트')}
            {navLink('/portfolio', '포트폴리오')}
            {navLink('/account', '계좌')}
            {isAdmin && navLink('/admin', '관리자')}
          </nav>
        )}

        {/* ── 우측 버튼 ─────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* 다크/라이트 모드 토글 */}
          <button
            onClick={toggle}
            aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
          >
            {isDark ? (
              /* 해 아이콘 → 라이트 모드로 전환 */
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1"  x2="12" y2="3"  />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22"  x2="5.64"  y2="5.64"  />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1"  y1="12" x2="3"  y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36" />
                <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"  />
              </svg>
            ) : (
              /* 달 아이콘 → 다크 모드로 전환 */
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          {isLoggedIn ? (
            <>
              <span className="text-[11px] text-gray-500 hidden sm:block">
                {user?.name}
              </span>
              <Link
                to="/mypage"
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                  isActive('/mypage')
                    ? 'bg-indigo-700 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                마이페이지
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-xs px-3 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
              >
                로그인
              </Link>
              <Link
                to="/register"
                className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                회원가입
              </Link>
            </>
          )}
        </div>

      </div>
    </header>
  )
}
