import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { login } from '@/services/authApi'
import { useAuthStore } from '@/store/authStore'
import { Alert } from '@/components/ui/Alert'
import { PageSpinner } from '@/components/ui/Spinner'

/**
 * 전시(데모)용 즉석 로그인 — /admin/login/:email/:pw
 * URL의 자격증명으로 바로 로그인 후 메인으로 진입한다.
 * 토이 프로젝트 시연 전용: URL에 비밀번호가 노출되므로 데모 계정으로만 사용할 것.
 */
export function DirectLoginPage() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore((s) => s.setAuth)
  const { email = '', pw = '' } = useParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    login({ email, password: pw })
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
