import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, HelpCircle, Shield, FileText, Plus, type LucideIcon } from 'lucide-react'
import {
  listDocuments,
  DOC_TYPE_LABEL,
  INGEST_STATUS_LABEL,
  type DocType,
  type IngestStatus,
  type DocumentItem,
} from '@/services/assistantApi'
import { useCursorList } from '@/hooks/useCursorList'
import { LoadingDots } from '@/components/ui/Spinner'
import { formatDate } from '@/utils/formatDate'
import { Alert } from '@/components/ui/Alert'
import {
  AdminPageHeader,
  StatCard,
  FilterPills,
  AdminSearchInput,
  AdminButton,
} from '@/components/admin'

const TYPE_ICON: Record<DocType, LucideIcon> = {
  GUIDE:  BookOpen,
  FAQ:    HelpCircle,
  POLICY: Shield,
  TERMS:  FileText,
}

const TYPE_TONE: Record<DocType, { bg: string; text: string }> = {
  GUIDE:  { bg: 'bg-indigo-50 dark:bg-indigo-500/15',     text: 'text-indigo-700 dark:text-indigo-300' },
  FAQ:    { bg: 'bg-sky-50 dark:bg-sky-500/15',           text: 'text-sky-700 dark:text-sky-300' },
  POLICY: { bg: 'bg-emerald-50 dark:bg-emerald-500/15',   text: 'text-emerald-700 dark:text-emerald-300' },
  TERMS:  { bg: 'bg-slate-100 dark:bg-slate-800',         text: 'text-slate-700 dark:text-slate-200' },
}

const INGEST_TONE: Record<IngestStatus, { dot: string; text: string }> = {
  PROCESSING:      { dot: 'bg-amber-500 animate-pulse', text: 'text-amber-700 dark:text-amber-400' },
  COMPLETED:       { dot: 'bg-emerald-500',             text: 'text-emerald-700 dark:text-emerald-400' },
  FAILED:          { dot: 'bg-rose-500',                text: 'text-rose-700 dark:text-rose-400' },
  CLEANUP_PENDING: { dot: 'bg-slate-400',               text: 'text-slate-500 dark:text-slate-400' },
  DELETED:         { dot: 'bg-slate-400',               text: 'text-slate-500 dark:text-slate-400' },
}

export function DocumentListPage() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [type, setType] = useState<'' | DocType>('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword), 300)
    return () => clearTimeout(t)
  }, [keyword])

  const fetcher = useCallback(
    (cursor?: string) =>
      listDocuments({
        keyword:       debouncedKeyword || undefined,
        type:          (type || undefined) as DocType | undefined,
        lastUpdatedAt: cursor,
      }),
    [debouncedKeyword, type],
  )

  const { items, hasNext, loading, error, loadMore } = useCursorList(fetcher)

  // 통계 — 현재 로드된 아이템 기준 집계 (cursor 페이지라 전체수는 별도 API 없음)
  const stats = useMemo(() => {
    const total = items.length
    const completed = items.filter((d) => d.ingestStatus === 'COMPLETED').length
    const processing = items.filter((d) => d.ingestStatus === 'PROCESSING').length
    const failed = items.filter((d) => d.ingestStatus === 'FAILED').length
    return { total, completed, processing, failed }
  }, [items])

  const typeOptions = useMemo(() => [
    { value: '' as const, label: '전체' },
    ...(Object.keys(DOC_TYPE_LABEL) as DocType[]).map((t) => ({
      value: t,
      label: DOC_TYPE_LABEL[t],
    })),
  ], [])

  return (
    <div>
      <AdminPageHeader
        kicker="Assistant · Documents"
        title="문서 관리"
        subtitle="AntsCamp 챗봇이 학습하는 모든 자료를 등록·관리합니다. 업로드된 문서는 임베딩 후 RAG 응답에 활용됩니다."
        action={
          <AdminButton
            variant="primary"
            icon={<Plus className="w-3.5 h-3.5" strokeWidth={2.5} />}
            onClick={() => navigate('/admin/assistant/documents/new')}
          >
            새 문서 등록
          </AdminButton>
        }
      />

      {/* 통계 */}
      <div className="grid grid-cols-4 gap-4 mb-7">
        <StatCard label="로드된 문서" value={stats.total}      tone="neutral" hint={hasNext ? '+ 더 있음' : '전체 표시'} />
        <StatCard label="완료"       value={stats.completed} tone="emerald" />
        <StatCard label="처리 중"     value={stats.processing} tone="amber" />
        <StatCard label="실패"       value={stats.failed}    tone="rose" />
      </div>

      {/* 액션 바 */}
      <div className="flex items-center gap-3 mb-4">
        <AdminSearchInput
          value={keyword}
          onChange={setKeyword}
          placeholder="제목·내용으로 검색"
          className="flex-1 max-w-md"
        />
      </div>

      {/* 유형 필터 */}
      <div className="mb-5">
        <FilterPills options={typeOptions} value={type} onChange={(v) => setType(v as '' | DocType)} />
      </div>

      {error && <Alert className="mb-4">{error}</Alert>}

      {/* 목록 */}
      <div className="flex flex-col gap-3">
        {!loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <BookOpen className="w-7 h-7 text-slate-400 mb-3" strokeWidth={1.75} />
            <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-200">문서가 없습니다</p>
            <p className="text-[12px] text-slate-500 dark:text-slate-500 mt-1">새 문서를 등록하면 자동으로 인덱싱됩니다</p>
          </div>
        ) : (
          items.map((doc) => <Row key={doc.documentId} doc={doc} onClick={() => navigate(`/admin/assistant/documents/${doc.documentId}`)} />)
        )}

        {loading && <div className="flex justify-center py-10"><LoadingDots /></div>}

        {hasNext && !loading && (
          <button
            onClick={loadMore}
            className="mt-2 w-full py-3 text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl transition-colors"
          >
            더 보기 ↓
          </button>
        )}
      </div>
    </div>
  )
}

function Row({ doc, onClick }: { doc: DocumentItem; onClick: () => void }) {
  const Icon = TYPE_ICON[doc.docType]
  const typeTone = TYPE_TONE[doc.docType]
  const ingestTone = INGEST_TONE[doc.ingestStatus]
  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(15,23,42,0.12)] dark:hover:shadow-[0_14px_36px_-14px_rgba(0,0,0,0.55)] rounded-2xl p-5 flex items-center gap-5 transition-all"
    >
      <span className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${typeTone.bg} ${typeTone.text}`}>
        <Icon className="w-5 h-5" strokeWidth={1.75} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${typeTone.bg} ${typeTone.text}`}>
            {DOC_TYPE_LABEL[doc.docType]}
          </span>
          <span className={`inline-flex items-center gap-1.5 text-[10.5px] font-semibold ${ingestTone.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${ingestTone.dot}`} />
            {INGEST_STATUS_LABEL[doc.ingestStatus]}
          </span>
        </div>
        <p className="text-[14.5px] font-semibold text-slate-900 dark:text-slate-100 truncate">{doc.title}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{formatDate(doc.updatedAt)}</p>
      </div>
      <svg className="w-4 h-4 text-slate-300 dark:text-slate-700 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}
