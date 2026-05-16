import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, HelpCircle, Shield, FileText, ArrowRight, Sparkles } from 'lucide-react'
import {
  listDocuments,
  DOC_TYPE_LABEL,
  type DocumentItem,
  type DocType,
} from '@/services/assistantApi'

const HOME_LIMIT = 5

type TabKey = '' | DocType

const TABS: { key: TabKey; label: string }[] = [
  { key: '',       label: '전체' },
  { key: 'GUIDE',  label: '가이드' },
  { key: 'FAQ',    label: 'FAQ' },
  { key: 'POLICY', label: '정책' },
  { key: 'TERMS',  label: '약관' },
]

interface TypeVisual {
  icon: ReactNode
  fg: string
  bg: string
}

const TYPE_VISUAL: Record<DocType, TypeVisual> = {
  GUIDE:  { icon: <BookOpen   className="w-3.5 h-3.5" />, fg: '#a5b4fc',           bg: 'rgba(99,102,241,0.16)' },
  FAQ:    { icon: <HelpCircle className="w-3.5 h-3.5" />, fg: '#7dd3fc',           bg: 'rgba(56,189,248,0.16)' },
  POLICY: { icon: <Shield     className="w-3.5 h-3.5" />, fg: '#6ee7b7',           bg: 'rgba(16,185,129,0.16)' },
  TERMS:  { icon: <FileText   className="w-3.5 h-3.5" />, fg: '#94a3b8',           bg: 'rgba(148,163,184,0.18)' },
}

export function GuidesWidget() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabKey>('')
  const [items, setItems] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(false)
    listDocuments({ type: (tab || undefined) as DocType | undefined })
      .then((page) => {
        if (cancelled) return
        setItems(page.items.filter((d) => d.ingestStatus === 'COMPLETED').slice(0, HOME_LIMIT))
      })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tab])

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col h-full">
      {/* 헤더 — HotStocks / NewsFeed 와 동일 톤 */}
      <div
        className="flex items-center justify-between px-4 pt-3.5 pb-2.5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h3 className="text-sm font-bold text-gray-100 flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-indigo-300" />
          가이드
        </h3>
        <Link
          to="/guides"
          className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          전체 보기
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* 탭 — NewsFeed 와 비슷한 압축 pill */}
      <div
        className="flex gap-1 px-3 py-2 flex-shrink-0 overflow-x-auto bg-gray-950"
        style={{ borderBottom: '1px solid var(--border-soft)' }}
      >
        {TABS.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1 text-[10.5px] px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              {t.key === '' && <Sparkles className="w-3 h-3" />}
              {t.label}
            </button>
          )
        })}
      </div>

      {/* 리스트 */}
      <div className="flex-1 flex flex-col divide-soft">
        {loading ? (
          Array.from({ length: HOME_LIMIT }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 animate-pulse">
              <span className="w-7 h-7 rounded-xl bg-gray-800 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-800 rounded w-4/5" />
                <div className="h-2.5 bg-gray-800 rounded w-1/4" />
              </div>
            </div>
          ))
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 text-center">
            <p className="text-xs text-gray-500">가이드를 불러올 수 없습니다</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 text-center gap-1">
            <p className="text-xs text-gray-400 font-medium">아직 가이드가 없어요</p>
            <p className="text-[10px] text-gray-600">
              {tab ? '다른 탭을 선택해보세요' : '곧 다양한 가이드가 추가될 예정입니다'}
            </p>
          </div>
        ) : (
          items.map((doc) => {
            const v = TYPE_VISUAL[doc.docType]
            return (
              <button
                key={doc.documentId}
                onClick={() => navigate(`/guides/${doc.documentId}`)}
                className="group w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-800/40"
              >
                <span
                  className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                  style={{ background: v.bg, color: v.fg }}
                >
                  {v.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-gray-200 truncate group-hover:text-indigo-300 transition-colors">
                    {doc.title}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{DOC_TYPE_LABEL[doc.docType]}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-700 flex-shrink-0 transition-all group-hover:text-indigo-400 group-hover:translate-x-0.5" />
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
