import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DOC_TYPE_LABEL, type DocType, type SaveDocumentRequest } from '@/services/assistantApi'
import { Alert } from '@/components/ui/Alert'
import { AdminCard } from '@/components/admin'

interface Props {
  initial?: SaveDocumentRequest
  onSubmit: (data: SaveDocumentRequest) => Promise<void>
  submitLabel?: string
  disabled?: boolean
  disabledReason?: string
  /** 우측 사이드 패널 상단에 추가로 표시할 컨텐츠 */
  extraSidebar?: React.ReactNode
}

const DOC_TYPES = Object.keys(DOC_TYPE_LABEL) as DocType[]

const DOC_TYPE_DESC: Record<DocType, string> = {
  FAQ:    '질문/답변 형식의 짧은 안내',
  POLICY: '회사 정책 · 운영 규정',
  GUIDE:  '사용자 가이드 · 사용법',
  TERMS:  '서비스 약관 · 법적 문서',
}

const DOC_TYPE_ICON: Record<DocType, string> = {
  FAQ:    '❓',
  POLICY: '📋',
  GUIDE:  '📘',
  TERMS:  '📜',
}

const TITLE_MAX = 100

export function DocumentForm({
  initial,
  onSubmit,
  submitLabel = '저장',
  disabled: externalDisabled,
  disabledReason,
  extraSidebar,
}: Props) {
  const navigate = useNavigate()
  const [form, setForm] = useState<SaveDocumentRequest>(
    initial ?? { title: '', docType: 'FAQ', content: '' },
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof SaveDocumentRequest>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await onSubmit(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const titleLen   = form.title.length
  const contentLen = form.content.length
  const titleNear  = titleLen >= TITLE_MAX * 0.85
  const wordCount  = form.content.trim() ? form.content.trim().split(/\s+/).length : 0

  const canSubmit = !loading && !externalDisabled && form.title.trim().length > 0 && form.content.trim().length > 0

  // ⌘/Ctrl + Enter 단축키
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSubmit) {
        e.preventDefault()
        handleSubmit(e as unknown as React.FormEvent)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSubmit, form])

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        {/* ── 좌측: 폼 본체 ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* 메타 카드 — 제목 + 타입 */}
          <AdminCard label="메타 정보" right={<span>필수</span>}>
            <div className="flex flex-col gap-5">
              {/* 제목 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">제목</label>
                  <span className={`text-[10.5px] font-mono ${titleNear ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    {titleLen} / {TITLE_MAX}
                  </span>
                </div>
                <input
                  value={form.title}
                  onChange={set('title')}
                  maxLength={TITLE_MAX}
                  required
                  placeholder="예: 대회 참가 신청 절차 가이드"
                  className="w-full bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-[14px] font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/10 transition-all"
                />
              </div>

              {/* 타입 */}
              <div>
                <label className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-200 mb-1.5 block">타입</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DOC_TYPES.map((t) => {
                    const active = form.docType === t
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, docType: t }))}
                        className={
                          active
                            ? 'relative rounded-xl border-2 border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-2.5 text-left shadow-sm'
                            : 'relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 px-3 py-2.5 text-left hover:border-slate-300 dark:hover:border-slate-700 transition-colors'
                        }
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-base leading-none">{DOC_TYPE_ICON[t]}</span>
                          <span className={`text-[12.5px] font-semibold ${active ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-100'}`}>
                            {DOC_TYPE_LABEL[t]}
                          </span>
                          {active && (
                            <svg className="ml-auto w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                            </svg>
                          )}
                        </div>
                        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight">{DOC_TYPE_DESC[t]}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </AdminCard>

          {/* 본문 카드 */}
          <AdminCard
            label="본문"
            right={
              <div className="flex items-center gap-3 font-mono">
                <span>{contentLen.toLocaleString()} 자</span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span>{wordCount.toLocaleString()} 단어</span>
              </div>
            }
            noPadding
          >
            <textarea
              value={form.content}
              onChange={set('content')}
              required
              rows={20}
              placeholder={`문서 내용을 입력하세요.

· 마크다운 형식을 그대로 사용할 수 있습니다.
· 등록 후 자동으로 청크 단위로 분할되어 임베딩됩니다.`}
              className="w-full bg-transparent px-5 py-4 text-[13.5px] font-mono leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none resize-y min-h-[340px]"
            />
          </AdminCard>
        </div>

        {/* ── 우측: 사이드 패널 ──────────────────── */}
        <aside className="flex flex-col gap-3 lg:sticky lg:top-6 self-start">
          {extraSidebar}

          {/* 요약 */}
          <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 mb-3">
              {initial ? '편집 요약' : '등록 요약'}
            </p>
            <div className="flex flex-col gap-2.5 text-[12px]">
              <SidebarRow label="타입">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                  <span>{DOC_TYPE_ICON[form.docType]}</span>
                  {DOC_TYPE_LABEL[form.docType]}
                </span>
              </SidebarRow>
              <SidebarRow label="제목 길이"><span className="font-mono text-slate-700 dark:text-slate-200">{titleLen} / {TITLE_MAX}</span></SidebarRow>
              <SidebarRow label="본문 분량"><span className="font-mono text-slate-700 dark:text-slate-200">{contentLen.toLocaleString()} 자</span></SidebarRow>
              <SidebarRow label="예상 청크"><span className="font-mono text-slate-700 dark:text-slate-200">~ {Math.max(1, Math.ceil(contentLen / 500))} 개</span></SidebarRow>
            </div>
          </div>

          {/* 인덱싱 안내 */}
          <div className="rounded-2xl p-4 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">i</span>
              <span className="text-[12.5px] font-semibold text-indigo-800 dark:text-indigo-200">인덱싱 프로세스</span>
            </div>
            <ol className="flex flex-col gap-1.5 text-[11.5px] text-indigo-900 dark:text-indigo-200/80 leading-relaxed">
              <li className="flex gap-1.5"><span className="font-mono text-indigo-600 dark:text-indigo-400">1.</span>등록 시 자동으로 청크 분할</li>
              <li className="flex gap-1.5"><span className="font-mono text-indigo-600 dark:text-indigo-400">2.</span>임베딩 생성 및 벡터 DB 저장</li>
              <li className="flex gap-1.5"><span className="font-mono text-indigo-600 dark:text-indigo-400">3.</span>완료되면 어시스턴트 답변에 자동 반영</li>
            </ol>
          </div>
        </aside>
      </div>

      {/* 하단 sticky 액션바 */}
      <div className="sticky bottom-0 mt-6 -mx-6 px-6 py-3 bg-white/85 dark:bg-slate-950/85 backdrop-blur border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11.5px] text-slate-500 dark:text-slate-400">
            <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[10px] text-slate-600 dark:text-slate-300">⌘</kbd>
            <span>+</span>
            <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[10px] text-slate-600 dark:text-slate-300">Enter</kbd>
            <span className="ml-1">로 빠르게 저장</span>

            {externalDisabled && disabledReason && (
              <span className="ml-4 inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse flex-shrink-0" />
                {disabledReason}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-[13px] px-4 py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white hover:opacity-90 text-white dark:text-slate-900 text-[13px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm inline-flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                  저장 중...
                </>
              ) : (
                <>
                  {submitLabel}
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}

function SidebarRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </div>
  )
}
