import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '@/services/authApi'
import { useAuthStore } from '@/store/authStore'
import { Alert } from '@/components/ui/Alert'
import { PageSpinner } from '@/components/ui/Spinner'

/** 전시(데모)용 게스트 계정 — 시연 시 누구나 바로 둘러볼 수 있도록 고정된 데모 계정으로 로그인한다. */
const GUEST_CREDENTIALS = { email: 'admin@antcamp.com', password: 'Admin123!' }

/**
 * 전시(데모)용 즉석 로그인 — /guest/login
 * 고정된 데모 계정으로 바로 로그인 후 메인으로 진입한다.
 * 토이 프로젝트 시연 전용.
 */
export function GuestLoginPage() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore((s) => s.setAuth)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    login(GUEST_CREDENTIALS)
      .then(({ user, accessToken, refreshToken }) => {
        if (cancelled) return
        setAuth(user, accessToken, refreshToken)
        navigate('/', { replace: true })
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : '로그인 실패')
      })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="min-h-[calc(100vh-57px)] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <Alert>{error}</Alert>
        </div>
      </div>
    )
  }
  return <PageSpinner />
}
