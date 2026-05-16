import { useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, HelpCircle, Shield, FileText, Search, Sparkles, ArrowRight, X, MessageCircle, Command } from 'lucide-react'
import {
  listDocuments,
  DOC_TYPE_LABEL,
  type DocType,
  type DocumentItem,
} from '@/services/assistantApi'
import { useCursorList } from '@/hooks/useCursorList'
import { useThemeStore } from '@/store/themeStore'
import { LoadingDots } from '@/components/ui/Spinner'

// ── 탭 ────────────────────────────────────────────────────────────────────────
type TabKey = '' | DocType

const TABS: { key: TabKey; label: string; icon: ReactNode }[] = [
  { key: '',       label: '전체',   icon: <Sparkles  className="w-3.5 h-3.5" /> },
  { key: 'GUIDE',  label: '가이드', icon: <BookOpen  className="w-3.5 h-3.5" /> },
  { key: 'FAQ',    label: 'FAQ',    icon: <HelpCircle className="w-3.5 h-3.5" /> },
  { key: 'POLICY', label: '정책',   icon: <Shield    className="w-3.5 h-3.5" /> },
  { key: 'TERMS',  label: '약관',   icon: <FileText  className="w-3.5 h-3.5" /> },
]

// ── 타입별 시각 (Tailwind 다크 변형으로 라이트/다크 자동 전환) ─────────────────
const ICON_RING: Record<DocType, string> = {
  GUIDE:  'bg-indigo-100 text-indigo-700 border-indigo-200/80  dark:bg-indigo-500/20  dark:text-indigo-200 dark:border-indigo-400/40',
  FAQ:    'bg-sky-100    text-sky-700    border-sky-200/80     dark:bg-sky-500/20     dark:text-sky-200    dark:border-sky-400/40',
  POLICY: 'bg-emerald-100 text-emerald-700 border-emerald-200/80 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-400/40',
  TERMS:  'bg-slate-100  text-slate-600  border-slate-200/80   dark:bg-white/10       dark:text-white/70   dark:border-white/15',
}

const ACCENT: Record<DocType, string> = {
  GUIDE:  '#6366f1',
  FAQ:    '#0ea5e9',
  POLICY: '#10b981',
  TERMS:  '#94a3b8',
}

const CHIP_CLASS: Record<DocType, string> = {
  GUIDE:  'chip chip-indigo',
  FAQ:    'chip chip-sky',
  POLICY: 'chip chip-emerald',
  TERMS:  'chip chip-slate',
}

const TYPE_ICON: Record<DocType, ReactNode> = {
  GUIDE:  <BookOpen   className="w-5 h-5" />,
  FAQ:    <HelpCircle className="w-5 h-5" />,
  POLICY: <Shield     className="w-5 h-5" />,
  TERMS:  <FileText   className="w-5 h-5" />,
}

// ── 페이지 ────────────────────────────────────────────────────────────────────
export function GuidesPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabKey>('')
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword), 300)
    return () => clearTimeout(t)
  }, [keyword])

  const fetcher = useCallback(
    (cursor?: string) =>
      listDocuments({
        keyword: debouncedKeyword || undefined,
        type:    (tab || undefined) as DocType | undefined,
        lastUpdatedAt: cursor,
      }),
    [debouncedKeyword, tab],
  )

  const { items, hasNext, loading, error, loadMore } = useCursorList(fetcher)

  // 사용자에게는 인덱싱 완료된 문서만 노출
  const docs = useMemo(
    () => items.filter((d) => d.ingestStatus === 'COMPLETED'),
    [items],
  )

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8">
      <Hero
        keyword={keyword}
        onKeywordChange={setKeyword}
        onClearKeyword={() => setKeyword('')}
        tab={tab}
        onTabChange={setTab}
      />

      {/* 결과 */}
      {error && (
        <div className="mb-4 rounded-2xl border px-4 py-3 text-sm
                        border-rose-300/70 bg-rose-50 text-rose-700
                        dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      )}

      {loading && docs.length === 0 ? (
        <SkeletonList />
      ) : docs.length === 0 ? (
        <EmptyState keyword={debouncedKeyword} />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {docs.map((doc) => (
            <li key={doc.documentId}>
              <GuideListRow doc={doc} onClick={() => navigate(`/guides/${doc.documentId}`)} />
            </li>
          ))}
        </ul>
      )}

      {/* 더 보기 */}
      {hasNext && !loading && (
        <div className="flex justify-center mt-8">
          <button
            onClick={loadMore}
            className="px-6 py-2.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-2
                       text-slate-700 bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-700
                       dark:text-gray-300 dark:bg-gray-900 dark:border-gray-800 dark:hover:border-indigo-500/60 dark:hover:text-white"
          >
            더 많은 가이드 보기
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {loading && docs.length > 0 && (
        <div className="flex justify-center py-8">
          <LoadingDots />
        </div>
      )}
    </div>
  )
}

// ── 히어로 (라이트=민트×코랄 / 다크=사이버 네온) ──────────────────────────────
function Hero({
  keyword, onKeywordChange, onClearKeyword, tab, onTabChange,
}: {
  keyword: string
  onKeywordChange: (v: string) => void
  onClearKeyword: () => void
  tab: TabKey
  onTabChange: (v: TabKey) => void
}) {
  const { isDark } = useThemeStore()

  // 컨테이너 배경
  const containerBg = isDark ? '#0B0118' : '#F0FDFA'
  const containerBorder = isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(20,184,166,0.18)'

  // 타이틀 그라데이션 텍스트
  const accentGradient = isDark
    ? 'linear-gradient(135deg,#06B6D4 0%,#A78BFA 50%,#EC4899 100%)'
    : 'linear-gradient(135deg,#14B8A6 0%,#06B6D4 100%)'

  // 활성 탭 그라데이션
  const activeTabBg = isDark
    ? 'linear-gradient(135deg,#06B6D4 0%,#A78BFA 100%)'
    : 'linear-gradient(135deg,#14B8A6 0%,#06B6D4 100%)'
  const activeTabShadow = isDark
    ? '0 8px 22px -8px rgba(167,139,250,0.55)'
    : '0 6px 18px -8px rgba(20,184,166,0.55)'

  return (
    <div
      className="relative overflow-hidden rounded-3xl mb-6 px-8 py-10 md:px-12 md:py-12 transition-colors duration-300"
      style={{ background: containerBg, border: containerBorder }}
    >
      {/* ── 라이트: 코랄·민트 블롭 / 다크: 네온 글로우 ──────────────────────── */}
      {isDark ? (
        <>
          <div
            className="absolute pointer-events-none"
            style={{
              top: -120, right: -100, width: 420, height: 420, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(236,72,153,0.35) 0%, transparent 65%)',
              filter: 'blur(40px)',
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              bottom: -140, left: -120, width: 480, height: 480, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(6,182,212,0.40) 0%, transparent 65%)',
              filter: 'blur(40px)',
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              top: '40%', left: '45%', width: 360, height: 360, borderRadius: '50%', transform: 'translate(-50%,-50%)',
              background: 'radial-gradient(circle, rgba(167,139,250,0.30) 0%, transparent 65%)',
              filter: 'blur(36px)',
            }}
          />
          {/* 미세 그리드 */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),' +
                'linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              opacity: 0.5,
            }}
          />
        </>
      ) : (
        <>
          <div
            className="absolute pointer-events-none"
            style={{
              top: -60, right: -40, width: 320, height: 320, borderRadius: '50%',
              background: 'linear-gradient(135deg,#FB7185 0%,#FBBF24 100%)',
              opacity: 0.18,
              filter: 'blur(40px)',
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              bottom: -80, left: -60, width: 380, height: 380, borderRadius: '50%',
              background: 'linear-gradient(135deg,#2DD4BF 0%,#06B6D4 100%)',
              opacity: 0.2,
              filter: 'blur(50px)',
            }}
          />
        </>
      )}

      <div className="relative">
        {/* 컨텍스트 칩 — 출처 표시 */}
        <div className="flex items-center gap-2 mb-5">
          {isDark ? (
            <span
              className="inline-flex items-center gap-1.5 text-[10.5px] font-bold tracking-wider px-3 py-1.5 rounded-full text-white/85"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '0.5px solid rgba(236,72,153,0.5)',
                backdropFilter: 'blur(30px)',
                boxShadow: '0 0 24px -8px rgba(236,72,153,0.45)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#EC4899', boxShadow: '0 0 8px #EC4899' }}
              />
              <MessageCircle className="w-3 h-3" />
              KNOWLEDGE.AI
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 text-[10.5px] font-bold tracking-wider px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.85)',
                color: '#0F766E',
                border: '1px solid transparent',
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.95), rgba(255,255,255,0.95)),' +
                  'linear-gradient(135deg,#2DD4BF 0%,#06B6D4 100%)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
                boxShadow: '0 4px 14px -6px rgba(20,184,166,0.35)',
              }}
            >
              <Sparkles className="w-3 h-3" />
              KNOWLEDGE BASE
            </span>
          )}
          <span className={`inline-flex items-center gap-1 text-[10.5px] font-medium px-2.5 py-1 rounded-full
                            ${isDark ? 'text-white/55 bg-white/[0.04] border-white/10' : 'text-teal-800/70 bg-white/60 border-teal-200/70'} border`}>
            <MessageCircle className="w-3 h-3" />
            챗봇이 답변에 사용한 출처
          </span>
        </div>

        {/* 타이틀 */}
        <h1
          className="font-extrabold leading-[1.1] mb-3"
          style={{
            fontSize: 'clamp(32px, 4vw, 46px)',
            letterSpacing: '-0.03em',
            color: isDark ? '#FFFFFF' : '#134E4A',
          }}
        >
          가이드{' '}
          <span
            style={{
              backgroundImage: accentGradient,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            한 곳에서.
          </span>
        </h1>
        <p
          className="text-sm md:text-[15px] mb-8 max-w-xl"
          style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(19,78,74,0.7)' }}
        >
          챗봇이 학습하는 모든 문서를 한 눈에 살펴보세요.
        </p>

        {/* 검색바 */}
        {isDark ? (
          <DarkSearchBar
            keyword={keyword}
            onKeywordChange={onKeywordChange}
            onClearKeyword={onClearKeyword}
          />
        ) : (
          <LightSearchBar
            keyword={keyword}
            onKeywordChange={onKeywordChange}
            onClearKeyword={onClearKeyword}
          />
        )}

        {/* 카테고리 필터 pill */}
        <div className="flex flex-wrap gap-2 mt-6">
          {TABS.map((t) => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                className="group inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
                style={
                  active
                    ? { background: activeTabBg, color: '#fff', boxShadow: activeTabShadow, border: '1px solid transparent' }
                    : isDark
                      ? {
                          background: 'rgba(255,255,255,0.06)',
                          color: 'rgba(255,255,255,0.7)',
                          border: '0.5px solid rgba(255,255,255,0.1)',
                          backdropFilter: 'blur(20px)',
                        }
                      : {
                          background: 'rgba(255,255,255,0.85)',
                          color: '#134E4A',
                          border: '1px solid rgba(20,184,166,0.18)',
                        }
                }
              >
                {t.icon}
                {t.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── 검색바 (라이트) ──────────────────────────────────────────────────────────
function LightSearchBar({
  keyword, onKeywordChange, onClearKeyword,
}: {
  keyword: string
  onKeywordChange: (v: string) => void
  onClearKeyword: () => void
}) {
  return (
    <div
      className="relative max-w-2xl rounded-2xl flex items-center transition-all"
      style={{
        background: '#FFFFFF',
        boxShadow: '0 6px 20px rgba(15,118,110,0.08)',
        border: '1px solid rgba(20,184,166,0.12)',
      }}
    >
      <Search className="w-4 h-4 ml-5 flex-shrink-0" style={{ color: '#14B8A6' }} />
      <input
        value={keyword}
        onChange={(e) => onKeywordChange(e.target.value)}
        placeholder="궁금한 내용을 검색해보세요"
        className="flex-1 bg-transparent outline-none text-sm pl-3 pr-2 py-3.5"
        style={{ color: '#134E4A' }}
      />
      {keyword && (
        <button
          onClick={onClearKeyword}
          className="w-6 h-6 mr-1.5 rounded-full flex items-center justify-center transition-colors text-slate-400 hover:text-teal-700 hover:bg-teal-50"
          aria-label="검색어 지우기"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        type="button"
        className="mr-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-transform hover:scale-[1.02]"
        style={{
          background: 'linear-gradient(135deg,#14B8A6 0%,#06B6D4 100%)',
          boxShadow: '0 4px 12px rgba(20,184,166,0.3)',
        }}
        onClick={() => { /* 인풋 디바운스가 곧 적용되므로 No-op */ }}
      >
        <Search className="w-3.5 h-3.5" />
        검색
      </button>
    </div>
  )
}

// ── 검색바 (다크) ────────────────────────────────────────────────────────────
function DarkSearchBar({
  keyword, onKeywordChange, onClearKeyword,
}: {
  keyword: string
  onKeywordChange: (v: string) => void
  onClearKeyword: () => void
}) {
  return (
    <div
      className="relative max-w-2xl rounded-2xl flex items-center transition-all"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '0.5px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <Search className="w-4 h-4 ml-5 flex-shrink-0" style={{ color: '#06B6D4' }} />
      <input
        value={keyword}
        onChange={(e) => onKeywordChange(e.target.value)}
        placeholder="궁금한 내용을 검색해보세요"
        className="flex-1 bg-transparent outline-none text-sm pl-3 pr-2 py-3.5 text-white"
        style={{ caretColor: '#06B6D4' }}
      />
      {keyword ? (
        <button
          onClick={onClearKeyword}
          className="w-6 h-6 mr-3 rounded-full flex items-center justify-center transition-colors text-white/50 hover:text-white hover:bg-white/10"
          aria-label="검색어 지우기"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : (
        <span
          className="mr-3 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold"
          style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
        >
          <Command className="w-2.5 h-2.5" />
          K
        </span>
      )}
    </div>
  )
}

// ── 리스트 행 ─────────────────────────────────────────────────────────────────
function GuideListRow({ doc, onClick }: { doc: DocumentItem; onClick: () => void }) {
  const accent = ACCENT[doc.docType]
  return (
    <button
      onClick={onClick}
      className="group relative w-full flex items-center gap-4 px-5 py-4 rounded-2xl border text-left overflow-hidden transition-all
                 bg-white border-slate-200 hover:border-indigo-300 hover:shadow-[0_6px_20px_-12px_rgba(99,102,241,0.45)] hover:-translate-y-0.5
                 dark:bg-gray-900 dark:border-gray-800 dark:hover:border-indigo-500/50 dark:hover:shadow-[0_10px_28px_-12px_rgba(99,102,241,0.5)]"
    >
      {/* 좌측 액센트 바 */}
      <span
        className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: accent }}
      />

      {/* 아이콘 */}
      <span
        className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border transition-transform group-hover:scale-105 ${ICON_RING[doc.docType]}`}
      >
        {TYPE_ICON[doc.docType]}
      </span>

      {/* 본문 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={CHIP_CLASS[doc.docType]}>{DOC_TYPE_LABEL[doc.docType]}</span>
          <span className="text-[10px] text-slate-500 dark:text-gray-500">
            {formatRelative(doc.updatedAt)} 업데이트
          </span>
        </div>
        <p className="text-[14px] font-semibold truncate transition-colors
                      text-slate-900 group-hover:text-indigo-700
                      dark:text-gray-100 dark:group-hover:text-indigo-300">
          {doc.title}
        </p>
      </div>

      {/* 화살표 */}
      <ArrowRight className="w-4 h-4 flex-shrink-0 transition-all group-hover:translate-x-0.5
                             text-slate-400 group-hover:text-indigo-500
                             dark:text-gray-700 dark:group-hover:text-indigo-400" />
    </button>
  )
}

// ── 스켈레톤 / 빈 상태 ────────────────────────────────────────────────────────
function SkeletonList() {
  return (
    <ul className="flex flex-col gap-2.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-4 px-5 py-4 rounded-2xl border animate-pulse
                     bg-white border-slate-200
                     dark:bg-gray-900 dark:border-gray-800"
        >
          <span className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-gray-800" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-12 rounded-full bg-slate-100 dark:bg-gray-800" />
              <div className="h-3 w-20 rounded bg-slate-100 dark:bg-gray-800" />
            </div>
            <div className="h-4 rounded bg-slate-100 dark:bg-gray-800" style={{ width: `${65 + (i * 5) % 25}%` }} />
          </div>
          <div className="w-4 h-4 rounded bg-slate-100 dark:bg-gray-800" />
        </li>
      ))}
    </ul>
  )
}

function EmptyState({ keyword }: { keyword: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border
                      bg-indigo-50 border-indigo-200
                      dark:bg-indigo-500/10 dark:border-indigo-400/30">
        <BookOpen className="w-7 h-7 text-indigo-600 dark:text-indigo-300" />
      </div>
      <p className="text-sm font-semibold mb-1 text-slate-700 dark:text-gray-200">
        {keyword ? '검색 결과가 없습니다' : '아직 등록된 가이드가 없습니다'}
      </p>
      <p className="text-xs text-slate-500 dark:text-gray-500">
        {keyword ? '다른 키워드로 검색하거나 탭을 바꿔보세요' : '곧 다양한 가이드가 추가될 예정입니다'}
      </p>
    </div>
  )
}

// ── 유틸 ──────────────────────────────────────────────────────────────────────
function formatRelative(iso: string): string {
  if (!iso) return ''
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const sec  = Math.floor(diff / 1000)
    if (sec < 60)      return '방금 전'
    const min  = Math.floor(sec / 60)
    if (min < 60)      return `${min}분 전`
    const hour = Math.floor(min / 60)
    if (hour < 24)     return `${hour}시간 전`
    const day  = Math.floor(hour / 24)
    if (day < 30)      return `${day}일 전`
    const month = Math.floor(day / 30)
    if (month < 12)    return `${month}개월 전`
    return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
  } catch { return '' }
}
