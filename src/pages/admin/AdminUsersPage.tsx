import { useState, useEffect } from 'react'
import { getAllUsers, createManager, type AdminUser, type CreateManagerRequest } from '@/services/authApi'
import { LoadingDots } from '@/components/ui/Spinner'
import { Alert } from '@/components/ui/Alert'

const ROLE_LABEL: Record<string, string> = {
  ADMIN:   '최고관리자',
  MANAGER: '매니저',
  PLAYER:  '일반회원',
}
// chip 유틸리티 (index.css) 사용 — 라이트/다크 동시 대응
const ROLE_CHIP: Record<string, string> = {
  ADMIN:   'chip chip-rose',
  MANAGER: 'chip chip-indigo',
  PLAYER:  'chip chip-gray',
}

const INIT_FORM: CreateManagerRequest = { email: '', password: '', name: '', phone: '' }

export function AdminUsersPage() {
  const [users,   setUsers]   = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState<CreateManagerRequest>(INIT_FORM)
  const [creating,  setCreating]  = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [search, setSearch] = useState('')

  const load = () => {
    setLoading(true)
    setError(null)
    getAllUsers()
      .then(setUsers)
      .catch((e) => setError(`사용자 목록 로드 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true); setFormError(null)
    try {
      const created = await createManager(form)
      setUsers((prev) => [...prev, created])
      setForm(INIT_FORM)
      setShowForm(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '생성 실패')
    } finally {
      setCreating(false)
    }
  }

  const filtered = users.filter((u) =>
    !search ||
    u.name.includes(search) ||
    u.email.includes(search) ||
    u.role.includes(search.toUpperCase()),
  )

  // 역할별 카운트
  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1
    return acc
  }, {})

  return (
    <div>
      {/* 브레드크럼 */}
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-2">
        <span>관리자</span>
        <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
        </svg>
        <span className="text-gray-300 font-medium">사용자 관리</span>
      </div>

      {/* 타이틀 + 액션 */}
      <div className="flex items-end justify-between mb-5 gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-100">사용자 관리</h1>
          {!loading && (
            <p className="text-xs text-gray-500 mt-1">
              전체 {users.length}명
              {roleCounts.ADMIN   > 0 && <> · 최고관리자 {roleCounts.ADMIN}</>}
              {roleCounts.MANAGER > 0 && <> · 매니저 {roleCounts.MANAGER}</>}
              {roleCounts.PLAYER  > 0 && <> · 일반회원 {roleCounts.PLAYER}</>}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          매니저 생성
        </button>
      </div>

      {/* 매니저 생성 폼 */}
      {showForm && (
        <form onSubmit={handleCreate}
          className="bg-white border border-indigo-200 dark:bg-gray-900 dark:border-indigo-800/40 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-bold text-gray-100 mb-4">새 매니저 계정</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {([
              ['email',    '이메일',    'email',    '예: manager@antcamp.com'],
              ['password', '비밀번호',  'password', '8~15자, 대소문자+숫자+특수문자'],
              ['name',     '이름',      'text',     '실명 또는 닉네임'],
              ['phone',    '전화번호',  'tel',      '예: 010-1234-5678'],
            ] as const).map(([field, label, type, ph]) => (
              <div key={field}>
                <label className="text-[10px] text-gray-500 mb-1 block">{label}</label>
                <input
                  type={type}
                  value={form[field]}
                  onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  placeholder={ph}
                  required
                  className="w-full bg-white border border-slate-200 dark:bg-gray-800 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-gray-600 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            ))}
          </div>
          {formError && (
            <Alert className="mb-3">{formError}</Alert>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={creating}
              className="text-xs px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50">
              {creating ? '생성 중...' : '생성'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setFormError(null); setForm(INIT_FORM) }}
              className="text-xs px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-400 dark:border-transparent transition-colors">
              취소
            </button>
          </div>
        </form>
      )}

      {/* 검색 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 mb-4 flex items-center gap-2">
        <div className="flex items-center gap-1.5 pl-1 pr-2 border-r border-gray-800">
          <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <span className="text-[10px] font-medium text-gray-500">검색</span>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름 · 이메일 · 역할 검색"
          className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-100 placeholder:text-gray-600 outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* 에러 */}
      {error && (
        <Alert className="mb-4">{error}</Alert>
      )}

      {/* 테이블 */}
      {loading ? (
        <div className="flex justify-center py-16"><LoadingDots /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-16 text-gray-600 text-sm">사용자가 없습니다.</p>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div
            className="grid grid-cols-[2fr_2fr_1fr_1fr] text-[10px] font-semibold text-gray-500 px-5 py-2.5 uppercase tracking-wider"
            style={{ background: 'var(--gray-950)', borderBottom: '1px solid var(--border)' }}
          >
            <span>이름</span>
            <span>이메일</span>
            <span>전화번호</span>
            <span>역할</span>
          </div>
          <div style={{ borderTop: 'none' }}>
            {filtered.map((u, idx) => (
              <div
                key={u.userId}
                className="grid grid-cols-[2fr_2fr_1fr_1fr] items-center px-5 py-3.5 transition-colors"
                style={{
                  borderTop: idx === 0 ? 'none' : '1px solid var(--border-soft)',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <div>
                  <p className="text-[13px] font-medium text-gray-100">{u.name}</p>
                  <p className="text-[10px] text-gray-600 font-mono">{u.userId.slice(0, 8)}…</p>
                </div>
                <span className="text-xs text-gray-400 truncate">{u.email}</span>
                <span className="text-xs text-gray-500 font-mono">{u.phone}</span>
                <span>
                  <span className={ROLE_CHIP[u.role] ?? ROLE_CHIP.PLAYER}>
                    {ROLE_LABEL[u.role] ?? u.role}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}