import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { adminLogin } from '@/services/authApi'
import { useAuthStore } from '@/store/authStore'
import { Alert } from '@/components/ui/Alert'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore((s) => s.setAuth)

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const { user, accessToken, refreshToken } = await adminLogin({ email, password })
      if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
        setError('관리자 및 매니저 계정만 이용할 수 있습니다.')
        return
      }
      setAuth(user, accessToken, refreshToken)
      navigate('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : '관리자 로그인 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-57px)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-amber-600 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2"
              viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-100">관리자 로그인</h1>
          <p className="text-xs text-gray-500 mt-1">관리자 및 매니저 전용</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">이메일</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required placeholder="admin@example.com"
              className="w-full bg-gray-900 border border-amber-900 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-amber-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">비밀번호</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required placeholder="••••••••"
              className="w-full bg-gray-900 border border-amber-900 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {error && (
            <Alert>{error}</Alert>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-colors disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '관리자 로그인'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-xs text-gray-600 hover:text-gray-400">
            ← 일반 로그인으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}
