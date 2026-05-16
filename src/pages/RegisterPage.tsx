import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { register } from '@/services/authApi'
import { Alert } from '@/components/ui/Alert'

// 백엔드 @Pattern 과 동일한 정규식
const PW_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,15}$/

const inputCls =
  'w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-indigo-500 transition-colors'

export function RegisterPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '', confirm: '', name: '', phone: '' })
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // 클라이언트 사전 검증 (서버와 동일한 규칙)
    if (!PW_REGEX.test(form.password)) {
      setError('비밀번호는 영문 대/소문자·숫자·특수문자(@$!%*?&)를 각 1개 이상 포함하고 8~15자여야 합니다.')
      return
    }
    if (form.password !== form.confirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)
    try {
      await register({ email: form.email, password: form.password, name: form.name, phone: form.phone })
      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-57px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="text-xs text-gray-500 text-center mb-8">AntCamp 계정을 만들어 보세요</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">이메일</label>
            <input type="email" value={form.email} onChange={set('email')}
              required placeholder="example@email.com" className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">이름</label>
            <input type="text" value={form.name} onChange={set('name')}
              required placeholder="홍길동" className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">전화번호</label>
            <input type="tel" value={form.phone} onChange={set('phone')}
              required placeholder="01012345678" className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">
              비밀번호
              <span className="ml-1.5 text-gray-600 font-normal">대/소문자·숫자·특수문자 포함 8~15자</span>
            </label>
            <input type="password" value={form.password} onChange={set('password')}
              required placeholder="Example1!" className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">비밀번호 확인</label>
            <input type="password" value={form.confirm} onChange={set('confirm')}
              required placeholder="비밀번호 재입력" className={inputCls} />
          </div>

          {error && (
            <Alert>{error}</Alert>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors disabled:opacity-50 mt-1">
            {loading ? '가입 중...' : '가입하기'}
          </button>
        </form>

      </div>
    </div>
  )
}

