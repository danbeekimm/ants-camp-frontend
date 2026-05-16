import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  getNotification,
  ALERT_STATUS_LABEL,
  ALERT_SEVERITY_LABEL,
  ALERT_SOURCE_LABEL,
  RESOLUTION_ACTION_LABEL,
  type NotificationDetail,
  type AlertStatus,
  type AlertSeverity,
  type AlertSource,
} from '@/services/notificationApi'
import { LoadingDots } from '@/components/ui/Spinner'
import { Alert } from '@/components/ui/Alert'
import { formatDate } from '@/utils/formatDate'
import { AdminBackHeader, AdminCard } from '@/components/admin'

const STATUS_TONE: Record<AlertStatus, string> = {
  PENDING:       'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  SENT:          'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
  FAILED:        'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
  ACTION_FAILED: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30',
}
const STATUS_DOT: Record<AlertStatus, string> = {
  PENDING:       'bg-slate-400',
  SENT:          'bg-emerald-500',
  FAILED:        'bg-rose-500',
  ACTION_FAILED: 'bg-orange-500',
}

const SEVERITY_TONE: Record<AlertSeverity, string> = {
  CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
  WARNING:  'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  INFO:     'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30',
}
const SOURCE_TONE: Record<AlertSource, string> = {
  PROMETHEUS:  'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30',
  GRAFANA:     'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30',
  APPLICATION: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30',
}

export function NotificationDetailPage() {
  const { notificationId } = useParams<{ notificationId: string }>()

  const [detail,  setDetail]  = useState<NotificationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!notificationId) return
    setLoading(true)
    getNotification(notificationId)
      .then(setDetail)
      .catch((e) => setError(e instanceof Error ? e.message : '불러오기 실패'))
      .finally(() => setLoading(false))
  }, [notificationId])

  return (
    <div>
      <AdminBackHeader
        back="/admin/notifications"
        kicker="Operations · Alert"
        title={detail?.title ?? '알림 상세'}
        subtitle={notificationId && (
          <span className="font-mono text-[11.5px] text-slate-400 dark:text-slate-500">{notificationId}</span>
        )}
      />

      {loading && <div className="flex justify-center py-16"><LoadingDots /></div>}
      {error   && <Alert>{error}</Alert>}

      {detail && (
        <div className="flex flex-col gap-4">
          {/* 상태 칩 묶음 */}
          <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 flex flex-wrap items-center gap-2.5">
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${STATUS_TONE[detail.status]}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[detail.status]}`} />
              {ALERT_STATUS_LABEL[detail.status]}
            </span>
            <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border ${SEVERITY_TONE[detail.severity]} uppercase tracking-wider`}>
              {ALERT_SEVERITY_LABEL[detail.severity]}
            </span>
            <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border ${SOURCE_TONE[detail.source]}`}>
              {ALERT_SOURCE_LABEL[detail.source]}
            </span>
            {detail.actionButton && (
              <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30">
                {RESOLUTION_ACTION_LABEL[detail.actionButton]}
              </span>
            )}
          </div>

          {/* 기본 정보 */}
          <AdminCard label="기본 정보">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <InfoRow label="제목" value={detail.title} />
              <InfoRow label="Job" value={detail.job} mono />
              <InfoRow label="채널 ID" value={detail.channelId} mono />
              <InfoRow label="중복 제거 키" value={detail.deduplicationKey} mono />
              {detail.actionUserEmail && (
                <InfoRow label="처리 담당자" value={detail.actionUserEmail} />
              )}
              {detail.slackMessageTs && (
                <InfoRow label="Slack TS" value={detail.slackMessageTs} mono />
              )}
              <InfoRow label="생성일시" value={formatDate(detail.createdAt)} />
              <InfoRow label="수정일시" value={formatDate(detail.updatedAt)} />
            </div>
          </AdminCard>

          {/* 알림 내용 */}
          <AdminCard label="알림 내용">
            <p className="text-[13.5px] text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{detail.content}</p>
          </AdminCard>

          {/* AI 분석 */}
          {detail.aiAnalysis && (
            <CollapsibleCard label="AI 분석">
              <p className="text-[13.5px] text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{detail.aiAnalysis}</p>
            </CollapsibleCard>
          )}

          {/* Payload */}
          {detail.payload && (
            <CollapsibleCard label="원본 Payload">
              <pre className="text-[11.5px] text-slate-700 dark:text-slate-300 font-mono leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-950/60 rounded-xl px-4 py-3 overflow-x-auto border border-slate-200 dark:border-slate-800">
                {formatPayload(detail.payload)}
              </pre>
            </CollapsibleCard>
          )}
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 mb-1">{label}</p>
      <p className={`text-[13px] text-slate-800 dark:text-slate-100 break-all ${mono ? 'font-mono text-[12px]' : ''}`}>{value}</p>
    </div>
  )
}

function CollapsibleCard({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
      >
        <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</span>
        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </section>
  )
}

function formatPayload(raw: string) {
  try { return JSON.stringify(JSON.parse(raw), null, 2) } catch { return raw }
}
