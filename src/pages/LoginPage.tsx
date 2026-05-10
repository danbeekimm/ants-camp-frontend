import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '@/services/authApi'
import { useAuthStore } from '@/store/authStore'

export function LoginPage() {
  const navigate  = useNavigate()
  const setAuth   = useAuthStore((s) => s.setAuth)

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const { user, accessToken, refreshToken } = await login({ email, password })
      setAuth(user, accessToken, refreshToken)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-57px)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" viewBox="0 0 24 24">
              <path d="M3 17l6-6 4 4 8-8" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-100">로그인</h1>
          <p className="text-xs text-gray-500 mt-1">AntsCamp에 오신 것을 환영합니다</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">이메일</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required placeholder="example@email.com"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">비밀번호</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required placeholder="••••••••"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950 border border-red-800 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500 flex items-center justify-center gap-3">
          <span>계정이 없으신가요?</span>
          <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">회원가입</Link>
          <span>·</span>
          <Link to="/admin/login" className="text-gray-600 hover:text-gray-400">관리자 로그인</Link>
        </div>
      </div>
    </div>
  )
}
