import { useState, useEffect, type ReactNode } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import { BookOpen, HelpCircle, Shield, FileText, ChevronLeft, ArrowRight, MessageCircle, Sparkles } from 'lucide-react'
import {
  getPublicDocument,
  DOC_TYPE_LABEL,
  type DocumentDetail,
  type DocType,
} from '@/services/assistantApi'
import { useThemeStore } from '@/store/themeStore'
import { LoadingDots } from '@/components/ui/Spinner'

// ── 타입별 시각 ───────────────────────────────────────────────────────────────
const ICON_RING: Record<DocType, string> = {
  GUIDE:  'bg-indigo-100  text-indigo-700  border-indigo-200/80  dark:bg-indigo-500/20  dark:text-indigo-200  dark:border-indigo-400/40',
  FAQ:    'bg-sky-100     text-sky-700     border-sky-200/80     dark:bg-sky-500/20     dark:text-sky-200     dark:border-sky-400/40',
  POLICY: 'bg-emerald-100 text-emerald-700 border-emerald-200/80 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-400/40',
  TERMS:  'bg-slate-100   text-slate-600   border-slate-200/80   dark:bg-white/10       dark:text-white/70    dark:border-white/15',
}

const CHIP_CLASS: Record<DocType, string> = {
  GUIDE:  'chip chip-indigo',
  FAQ:    'chip chip-sky',
  POLICY: 'chip chip-emerald',
  TERMS:  'chip chip-slate',
}

const TYPE_ICON: Record<DocType, ReactNode> = {
  GUIDE:  <BookOpen   className="w-6 h-6" />,
  FAQ:    <HelpCircle className="w-6 h-6" />,
  POLICY: <Shield     className="w-6 h-6" />,
  TERMS:  <FileText   className="w-6 h-6" />,
}

export function GuideDetailPage() {
  const { documentId = '' } = useParams<{ documentId: string }>()
  const navigate = useNavigate()
  const [doc, setDoc] = useState<DocumentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!documentId) return
    // 챗봇 등에서 진입 시 이전 스크롤 위치가 남아있지 않도록 최상단으로 이동
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    setLoading(true); setError(null); setDoc(null)
    getPublicDocument(documentId)
      .then(setDoc)
      .catch((e) => setError(e instanceof Error ? e.message : '문서를 불러올 수 없습니다.'))
      .finally(() => setLoading(false))
  }, [documentId])

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* 뒤로 가기 */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-xs mb-5 transition-colors
                   text-slate-500 hover:text-teal-700
                   dark:text-white/50 dark:hover:text-cyan-300"
      >
        <ChevronLeft className="w-4 h-4" />
        가이드 목록으로
      </button>

      {/* 로딩 */}
      {loading && (
        <div className="rounded-3xl border p-8 bg-white border-slate-200 dark:bg-gray-900 dark:border-gray-800">
          <div className="animate-pulse space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-gray-800" />
              <div className="w-16 h-5 bg-slate-100 dark:bg-gray-800 rounded-full" />
            </div>
            <div className="h-7 w-3/4 bg-slate-100 dark:bg-gray-800 rounded" />
            <div className="space-y-2 pt-4">
              {[95, 88, 92, 70, 80, 60].map((w, i) => (
                <div key={i} className="h-3 bg-slate-100 dark:bg-gray-800 rounded" style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 에러 */}
      {!loading && error && (
        <div className="rounded-3xl border px-6 py-8 text-center
                        bg-rose-50 border-rose-200 text-rose-700
                        dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-200">
          <p className="text-sm mb-4">{error}</p>
          <Link to="/guides" className="inline-flex items-center gap-1 text-xs underline hover:opacity-80">
            가이드 목록으로 돌아가기
          </Link>
        </div>
      )}

      {/* 본문 */}
      {!loading && !error && doc && (
        <article className="relative overflow-hidden rounded-3xl border transition-colors duration-300
                            bg-white border-teal-200/40
                            dark:bg-[#0B0118] dark:border-white/10">
          <DetailHero doc={doc} />

          {/* 본문 — 마크다운 렌더 (백엔드는 raw markdown 문자열로 내려준다)
              약관 등 운영팀이 작성한 문서가 ① 1. ② 2. ... 처럼 단일 개행만으로 항목을
              나열한 경우가 많아 remark-breaks 로 single-newline 도 줄바꿈으로 인정한다. */}
          <div className="px-8 py-8">
            <div className="guide-md text-[14px] leading-relaxed break-keep
                            text-slate-700 dark:text-white/80">
              <ReactMarkdown remarkPlugins={[remarkBreaks]}>{doc.content}</ReactMarkdown>
            </div>
          </div>

          {/* 하단 CTA */}
          <div className="px-8 pb-8 pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t
                          border-teal-200/40 dark:border-white/10">
            <p className="text-xs text-slate-500 dark:text-white/45">
              도움이 되셨다면 다른 가이드도 살펴보세요.
            </p>
            <CTA />
          </div>
        </article>
      )}

      {/* 빈 로딩 (예외) */}
      {!loading && !error && !doc && (
        <div className="flex justify-center py-12">
          <LoadingDots />
        </div>
      )}
    </div>
  )
}

// 라이트 = 민트→시안 그라데이션 / 다크 = 시안→바이올렛 그라데이션
function CTA() {
  const { isDark } = useThemeStore()
  const bg = isDark
    ? 'linear-gradient(135deg,#06B6D4 0%,#A78BFA 100%)'
    : 'linear-gradient(135deg,#14B8A6 0%,#06B6D4 100%)'
  const shadow = isDark
    ? '0 8px 22px -8px rgba(167,139,250,0.55)'
    : '0 8px 22px -8px rgba(20,184,166,0.45)'
  return (
    <Link
      to="/guides"
      className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-semibold text-white transition-opacity hover:opacity-90"
      style={{ background: bg, boxShadow: shadow }}
    >
      가이드 목록 보기
      <ArrowRight className="w-3.5 h-3.5" />
    </Link>
  )
}

// ── 상세 페이지 히어로 (라이트=민트×코랄 / 다크=사이버 네온) ──────────────
function DetailHero({ doc }: { doc: DocumentDetail }) {
  const { isDark } = useThemeStore()

  const containerBg = isDark ? '#0B0118' : '#F0FDFA'
  const containerBorder = isDark ? '0.5px solid rgba(255,255,255,0.08)' : '1px solid rgba(20,184,166,0.18)'

  return (
    <div
      className="relative overflow-hidden px-8 pt-8 pb-8 transition-colors duration-300"
      style={{ background: containerBg, borderBottom: containerBorder }}
    >
      {/* 데코 — 라이트: 코랄·민트 블롭 / 다크: 네온 글로우 */}
      {isDark ? (
        <>
          <div
            className="absolute pointer-events-none"
            style={{
              top: -100, right: -60, width: 320, height: 320, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(236,72,153,0.32) 0%, transparent 65%)',
              filter: 'blur(36px)',
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              bottom: -110, left: -80, width: 340, height: 340, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(6,182,212,0.36) 0%, transparent 65%)',
              filter: 'blur(36px)',
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),' +
                'linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: '36px 36px',
              opacity: 0.45,
            }}
          />
        </>
      ) : (
        <>
          <div
            className="absolute pointer-events-none"
            style={{
              top: -50, right: -30, width: 240, height: 240, borderRadius: '50%',
              background: 'linear-gradient(135deg,#FB7185 0%,#FBBF24 100%)',
              opacity: 0.18,
              filter: 'blur(40px)',
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              bottom: -80, left: -50, width: 280, height: 280, borderRadius: '50%',
              background: 'linear-gradient(135deg,#2DD4BF 0%,#06B6D4 100%)',
              opacity: 0.22,
              filter: 'blur(50px)',
            }}
          />
        </>
      )}

      <div className="relative">
        {/* 출처 컨텍스트 칩 */}
        <div className="flex items-center gap-2 mb-4">
          {isDark ? (
            <span
              className="inline-flex items-center gap-1.5 text-[10.5px] font-bold tracking-wider px-2.5 py-1.5 rounded-full text-white/85"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '0.5px solid rgba(236,72,153,0.5)',
                backdropFilter: 'blur(30px)',
                boxShadow: '0 0 22px -8px rgba(236,72,153,0.4)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#EC4899', boxShadow: '0 0 8px #EC4899' }} />
              <MessageCircle className="w-3 h-3" />
              출처 문서
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 text-[10.5px] font-bold tracking-wider px-2.5 py-1.5 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.9)',
                color: '#0F766E',
                boxShadow: '0 4px 14px -6px rgba(20,184,166,0.3)',
                border: '1px solid rgba(20,184,166,0.25)',
              }}
            >
              <Sparkles className="w-3 h-3" />
              출처 문서
            </span>
          )}
        </div>

        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border ${ICON_RING[doc.docType]}`}>
            {TYPE_ICON[doc.docType]}
          </div>
          <div className="min-w-0 flex-1">
            <span className={CHIP_CLASS[doc.docType]}>{DOC_TYPE_LABEL[doc.docType]}</span>
            <h1
              className="font-extrabold leading-snug mt-2 break-keep"
              style={{
                fontSize: 'clamp(22px, 2.6vw, 28px)',
                letterSpacing: '-0.02em',
                color: isDark ? '#FFFFFF' : '#134E4A',
              }}
            >
              {doc.title}
            </h1>
          </div>
        </div>
      </div>
    </div>
  )
}
