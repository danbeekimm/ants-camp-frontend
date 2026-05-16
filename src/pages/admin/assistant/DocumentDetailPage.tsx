import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getDocument,
  updateDocument,
  deleteDocument,
  INGEST_STATUS_LABEL,
  type DocumentDetail,
  type IngestStatus,
  type SaveDocumentRequest,
} from '@/services/assistantApi'
import { DocumentForm } from './DocumentForm'
import { LoadingDots } from '@/components/ui/Spinner'
import { formatDate } from '@/utils/formatDate'
import { Alert } from '@/components/ui/Alert'
import { AdminBackHeader, AdminButton } from '@/components/admin'

const INGEST_TONE: Record<IngestStatus, { dot: string; text: string }> = {
  PROCESSING:      { dot: 'bg-amber-500 animate-pulse', text: 'text-amber-700 dark:text-amber-400' },
  COMPLETED:       { dot: 'bg-emerald-500',             text: 'text-emerald-700 dark:text-emerald-400' },
  FAILED:          { dot: 'bg-rose-500',                text: 'text-rose-700 dark:text-rose-400' },
  CLEANUP_PENDING: { dot: 'bg-slate-400',               text: 'text-slate-500 dark:text-slate-400' },
  DELETED:         { dot: 'bg-slate-400',               text: 'text-slate-500 dark:text-slate-400' },
}

const TERMINAL: IngestStatus[] = ['COMPLETED', 'FAILED', 'CLEANUP_PENDING', 'DELETED']

export function DocumentDetailPage() {
  const { documentId } = useParams<{ documentId: string }>()
  const navigate = useNavigate()
  const [doc, setDoc] = useState<DocumentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    if (!documentId) return
    try {
      const d = await getDocument(documentId)
      setDoc(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => { load() }, [load])

  // PROCESSING 상태일 때 3초 간격 폴링 → COMPLETED 되면 목록 이동
  useEffect(() => {
    if (!doc || TERMINAL.includes(doc.ingestStatus)) return
    const timer = setInterval(async () => {
      if (!documentId) return
      try {
        const updated = await getDocument(documentId)
        setDoc(updated)
        if (TERMINAL.includes(updated.ingestStatus)) {
          clearInterval(timer)
          if (updated.ingestStatus === 'COMPLETED') {
            navigate('/admin/assistant/documents', { replace: true })
          }
        }
      } catch { /* swallow polling errors */ }
    }, 3000)
    return () => clearInterval(timer)
  }, [doc?.ingestStatus, documentId, navigate, doc])

  const handleUpdate = async (data: SaveDocumentRequest) => {
    if (!documentId) return
    await updateDocument(documentId, data)
    load() // PROCESSING 상태로 갱신 → 폴링이 COMPLETED 감지 후 목록 이동
  }

  const handleDelete = async () => {
    if (!documentId || !confirm('문서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return
    setDeleting(true)
    try {
      await deleteDocument(documentId)
      navigate('/admin/assistant/documents', { replace: true })
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제 실패')
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center py-24"><LoadingDots /></div>
  }
  if (error || !doc) {
    return <Alert>{error ?? '문서를 불러올 수 없습니다.'}</Alert>
  }

  return (
    <div>
      <AdminBackHeader
        back="/admin/assistant/documents"
        kicker="Assistant · Document"
        title={doc.title}
        action={
          <AdminButton variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? '삭제 중...' : '삭제'}
          </AdminButton>
        }
      />

      {/* PROCESSING 배너 */}
      {doc.ingestStatus === 'PROCESSING' && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-[13px] px-4 py-3 rounded-xl mb-5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
          인제스트 처리 중입니다. 완료될 때까지 수정할 수 없습니다.
        </div>
      )}

      {/* FAILED 배너 */}
      {doc.ingestStatus === 'FAILED' && (
        <Alert className="mb-5">
          <p className="font-semibold">인제스트 처리에 실패했습니다.</p>
          {doc.failureReason && (
            <p className="mt-1 text-[12px] text-rose-700 dark:text-rose-300/80">{doc.failureReason}</p>
          )}
        </Alert>
      )}

      <DocumentForm
        key={doc.documentId}
        initial={{ title: doc.title, docType: doc.docType, content: doc.content }}
        onSubmit={handleUpdate}
        submitLabel="수정 저장"
        disabled={doc.ingestStatus === 'PROCESSING'}
        disabledReason="인제스트 처리 중"
        extraSidebar={
          <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">문서 상태</p>
            <MetaRow label="인제스트">
              <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold ${INGEST_TONE[doc.ingestStatus].text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${INGEST_TONE[doc.ingestStatus].dot}`} />
                {INGEST_STATUS_LABEL[doc.ingestStatus]}
              </span>
            </MetaRow>
            <MetaRow label="청크 수">
              <span className="text-[12.5px] font-mono text-slate-800 dark:text-slate-100">{doc.chunkCount.toLocaleString()}</span>
            </MetaRow>
            <MetaRow label="생성일">
              <span className="text-[11.5px] text-slate-500 dark:text-slate-400 font-mono">{formatDate(doc.createdAt)}</span>
            </MetaRow>
            {doc.updatedAt && (
              <MetaRow label="수정일">
                <span className="text-[11.5px] text-slate-500 dark:text-slate-400 font-mono">{formatDate(doc.updatedAt)}</span>
              </MetaRow>
            )}
          </div>
        }
      />
    </div>
  )
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10.5px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.14em] mb-1">{label}</p>
      {children}
    </div>
  )
}
