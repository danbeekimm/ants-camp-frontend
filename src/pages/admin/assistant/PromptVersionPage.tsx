import { useState, useEffect, useMemo } from 'react'
import { Plus, Check, Copy as CopyIcon } from 'lucide-react'
import {
  listPromptVersions,
  createPromptVersion,
  type PromptVersion,
} from '@/services/assistantApi'
import { LoadingDots } from '@/components/ui/Spinner'
import { Alert } from '@/components/ui/Alert'
import { AdminPageHeader, AdminButton, AdminCard, StatCard } from '@/components/admin'

export function PromptVersionPage() {
  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [selected, setSelected] = useState<PromptVersion | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [copied, setCopied]     = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      // 백엔드는 등록일 오름차순으로 주므로 최신이 위로 오도록 뒤집는다.
      const list = (await listPromptVersions()).slice().reverse()
      setVersions(list)
      if (list.length > 0 && !selected) setSelected(list[0])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (name: string, content: string) => {
    const created = await createPromptVersion({ name, content })
    setShowForm(false)
    await load()
    setSelected(created)
  }

  const handleCopy = async () => {
    if (!selected) return
    try {
      await navigator.clipboard.writeText(selected.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  return (
    <div>
      <AdminPageHeader
        kicker="Assistant · Prompts"
        title="프롬프트 버전 관리"
        subtitle="RAG 답변 생성에 사용되는 시스템 프롬프트를 버전 관리합니다. 평가 실행 시 특정 버전을 선택할 수 있습니다."
        action={
          <AdminButton
            variant={showForm ? 'secondary' : 'primary'}
            icon={showForm ? undefined : <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />}
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? '취소' : '새 버전 등록'}
          </AdminButton>
        }
      />

      {/* 통계 */}
      <div className="grid grid-cols-2 gap-4 mb-7">
        <StatCard label="전체 버전" value={loading ? '—' : versions.length} tone="neutral" />
        <StatCard
          label="최근 등록"
          value={<span className="text-[18px] font-mono">{versions[0]?.name ?? '—'}</span>}
          tone="violet"
        />
      </div>

      {/* 새 버전 등록 인라인 폼 */}
      {showForm && (
        <NewVersionForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          existingNames={versions.map((v) => v.name)}
        />
      )}

      {error && <Alert className="mb-5">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16"><LoadingDots /></div>
      ) : versions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl">📝</div>
          <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-200">등록된 프롬프트 버전이 없습니다</p>
          <p className="text-[12px] text-slate-500 dark:text-slate-500">우측 상단 “새 버전 등록”으로 첫 버전을 추가해주세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 items-start">
          {/* 버전 목록 — 최대 10개까지 화면에 표시, 초과분은 스크롤 */}
          <ul className="flex flex-col gap-1.5 max-h-[460px] overflow-y-auto pr-1">
            {versions.map((v) => {
              const active = selected?.promptVersionId === v.promptVersionId
              return (
                <li key={v.promptVersionId}>
                  <button
                    onClick={() => setSelected(v)}
                    className={
                      active
                        ? 'group w-full text-left px-3.5 py-2.5 rounded-xl border bg-indigo-50 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/40'
                        : 'group w-full text-left px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors'
                    }
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1 h-4 rounded-full flex-shrink-0"
                        style={{ background: active ? 'var(--accent)' : 'transparent' }}
                      />
                      <p className={`text-[13px] truncate font-mono ${active ? 'font-semibold text-indigo-700 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-200'}`}>
                        {v.name}
                      </p>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>

          {/* 콘텐츠 미리보기 */}
          {selected && (
            <AdminCard
              label={<span className="inline-flex items-center gap-2"><span className="chip chip-indigo">PROMPT</span><span className="font-mono text-[12.5px] text-slate-700 dark:text-slate-200 normal-case tracking-normal">{selected.name}</span></span>}
              right={
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                >
                  {copied ? (
                    <><Check className="w-3 h-3 text-emerald-500" strokeWidth={2.5} />복사됨</>
                  ) : (
                    <><CopyIcon className="w-3 h-3" />복사</>
                  )}
                </button>
              }
              noPadding
            >
              <textarea
                readOnly
                value={selected.content}
                rows={20}
                className="w-full bg-slate-50 dark:bg-slate-950/60 px-4 py-3 text-[12px] text-slate-700 dark:text-slate-200 font-mono resize-none outline-none leading-relaxed border-0"
              />
            </AdminCard>
          )}
        </div>
      )}
    </div>
  )
}

// ── 새 버전 등록 폼 ──────────────────────────────────────────────────────────
interface NewVersionFormProps {
  onSubmit: (name: string, content: string) => Promise<void>
  onCancel: () => void
  existingNames: string[]
}

function NewVersionForm({ onSubmit, onCancel, existingNames }: NewVersionFormProps) {
  // 마지막 버전에서 다음 추천 버전 자동 산정 (있으면 patch +1, 아니면 1.0.0)
  const suggested = useMemo(() => {
    for (let i = existingNames.length - 1; i >= 0; i--) {
      const m = existingNames[i].match(/^[vV](\d+)\.(\d+)\.(\d+)/)
      if (m) return { a: Number(m[1]), b: Number(m[2]), c: Number(m[3]) + 1 }
    }
    return { a: 1, b: 0, c: 0 }
  }, [existingNames])

  const [a, setA] = useState(suggested.a)
  const [b, setB] = useState(suggested.b)
  const [c, setC] = useState(suggested.c)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const composedName = `v${a}.${b}.${c}${title.trim() ? `_${title.trim()}` : ''}`
  const duplicated   = existingNames.includes(composedName)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('제목을 입력해주세요.'); return }
    if (duplicated)    { setError('동일한 이름의 버전이 이미 존재합니다.'); return }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(composedName, content)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-900/70 border-2 border-indigo-300 dark:border-indigo-500/40 rounded-2xl mb-6 overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-3 bg-indigo-50/60 dark:bg-indigo-500/10 border-b border-indigo-100 dark:border-indigo-500/20">
        <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">새 버전 등록</p>
        <span className="chip chip-indigo font-mono">{composedName}</span>
      </div>

      <div className="px-5 py-5 flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}

        {/* 버전 + 제목 */}
        <div className="flex flex-col gap-2">
          <label className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">버전 · 제목</label>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-mono text-slate-400 dark:text-slate-500">v</span>
            <VersionInput value={a} onChange={setA} ariaLabel="major" />
            <span className="text-base font-mono text-slate-400 dark:text-slate-500">.</span>
            <VersionInput value={b} onChange={setB} ariaLabel="minor" />
            <span className="text-base font-mono text-slate-400 dark:text-slate-500">.</span>
            <VersionInput value={c} onChange={setC} ariaLabel="patch" />
            <span className="text-base font-mono text-slate-400 dark:text-slate-500">_</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="버전 제목 (예: hallucination_fix)"
              required
              className="flex-1 min-w-[180px] bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/10 rounded-lg px-3 py-2 text-[13.5px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-all font-mono"
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            저장 시 <code className="font-mono text-indigo-700 dark:text-indigo-300">{composedName}</code> 형식으로 기록됩니다
            {duplicated && <span className="ml-2 text-rose-600 dark:text-rose-400">· 중복된 버전 이름입니다</span>}
          </p>
        </div>

        {/* 프롬프트 내용 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">프롬프트 내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={10}
            placeholder="시스템 프롬프트 내용을 입력하세요"
            className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/10 rounded-lg px-3 py-2.5 text-[12.5px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 font-mono outline-none transition-all resize-y min-h-[200px] leading-relaxed"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 px-5 py-3 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/60">
        <button
          type="button"
          onClick={onCancel}
          className="text-[13px] px-4 py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={submitting || duplicated}
          className="text-[13px] px-5 py-2 rounded-xl bg-slate-900 dark:bg-white hover:opacity-90 text-white dark:text-slate-900 font-semibold disabled:opacity-40 transition-all"
        >
          {submitting ? '등록 중...' : '등록'}
        </button>
      </div>
    </form>
  )
}

function VersionInput({
  value, onChange, ariaLabel,
}: { value: number; onChange: (v: number) => void; ariaLabel: string }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      onChange={(e) => {
        // 숫자만 허용, 0~99로 clamp
        const raw = e.target.value.replace(/\D/g, '')
        if (raw === '') { onChange(0); return }
        const n = Math.min(99, Math.max(0, Number(raw)))
        onChange(n)
      }}
      onFocus={(e) => e.target.select()}
      aria-label={ariaLabel}
      maxLength={2}
      className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/10 rounded-lg px-2 py-1.5 text-[13.5px] text-slate-900 dark:text-slate-100 font-mono outline-none transition-all text-center w-[52px]"
    />
  )
}
