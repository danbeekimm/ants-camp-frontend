import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import {
  listNotifications,
  ALERT_STATUS_LABEL,
  ALERT_SEVERITY_LABEL,
  ALERT_SOURCE_LABEL,
  RESOLUTION_ACTION_LABEL,
  type NotificationSummary,
  type AlertStatus,
  type AlertSeverity,
  type AlertSource,
} from '@/services/notificationApi'
import { LoadingDots } from '@/components/ui/Spinner'
import { Alert } from '@/components/ui/Alert'
import {
  AdminPageHeader,
  StatCard,
  FilterPills,
  AdminSelect,
} from '@/components/admin'

// ── 색 매핑 ─────────────────────────────────────────────────────────────────
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

// ── 페이지 ─────────────────────────────────────────────────────────────────
export function NotificationListPage() {
  const navigate = useNavigate()

  const [status,   setStatus]   = useState<AlertStatus | ''>('')
  const [severity, setSeverity] = useState<AlertSeverity | ''>('')
  const [source,   setSource]   = useState<AlertSource | ''>('')
  const [page,     setPage]     = useState(0)

  const [items,         setItems]         = useState<NotificationSummary[]>([])
  const [totalPages,    setTotalPages]    = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  // 통계용 — 필터 무관 전체 카운트 (1회 조회)
  const [stats, setStats] = useState<{ total: number; sent: number; pending: number; failed: number; actionFailed: number } | null>(null)
  useEffect(() => {
    Promise.all([
      listNotifications({ page: 0 }),
      listNotifications({ status: 'SENT', page: 0 }),
      listNotifications({ status: 'PENDING', page: 0 }),
      listNotifications({ status: 'FAILED', page: 0 }),
      listNotifications({ status: 'ACTION_FAILED', page: 0 }),
    ])
      .then(([a, b, c, d, e]) => setStats({
        total:        a.totalElements,
        sent:         b.totalElements,
        pending:      c.totalElements,
        failed:       d.totalElements,
        actionFailed: e.totalElements,
      }))
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listNotifications({
        status:   status   || undefined,
        severity: severity || undefined,
        source:   source   || undefined,
        page,
      })
      setItems(res.content)
      setTotalPages(res.totalPages)
      setTotalElements(res.totalElements)
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패')
    } finally {
      setLoading(false)
    }
  }, [status, severity, source, page])

  useEffect(() => { load() }, [load])

  const statusOptions = useMemo(() => [
    { value: '' as const, label: '전체' },
    ...(Object.keys(ALERT_STATUS_LABEL) as AlertStatus[]).map((s) => ({ value: s, label: ALERT_STATUS_LABEL[s] })),
  ], [])

  const severityOptions = useMemo(() => [
    { value: '' as const, label: '심각도 전체' },
    ...(Object.keys(ALERT_SEVERITY_LABEL) as AlertSeverity[]).map((s) => ({ value: s, label: ALERT_SEVERITY_LABEL[s] })),
  ], [])

  const sourceOptions = useMemo(() => [
    { value: '' as const, label: '소스 전체' },
    ...(Object.keys(ALERT_SOURCE_LABEL) as AlertSource[]).map((s) => ({ value: s, label: ALERT_SOURCE_LABEL[s] })),
  ], [])

  const hasFilter = status || severity || source

  return (
    <div>
      <AdminPageHeader
        kicker={
          <nav className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span>관리자</span>
            <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-600" strokeWidth={2} />
            <span className="text-slate-700 dark:text-slate-200 font-medium">알림 관리</span>
          </nav>
        }
        title="알림 관리"
        subtitle="Prometheus·Grafana 등에서 수신된 알림을 확인하고 처리합니다."
      />

      {/* 통계 */}
      <div className="grid grid-cols-5 gap-4 mb-7">
        <StatCard label="전체"   value={stats?.total   ?? '—'} tone="neutral" />
        <StatCard label="전송 완료" value={stats?.sent    ?? '—'} tone="emerald" hint={stats ? `${pct(stats.sent, stats.total)}%` : undefined} />
        <StatCard label="대기"   value={stats?.pending ?? '—'} tone="amber"   hint="후속 처리 필요" />
        <StatCard label="실패"   value={stats?.failed  ?? '—'} tone="rose"    hint="재전송 가능" />
        <StatCard label="액션 실패" value={stats?.actionFailed ?? '—'} tone="rose"    hint="후속 액션 오류" />
      </div>

      {/* 필터 — 상태 pill + 심각도/소스 select */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <FilterPills options={statusOptions} value={status} onChange={(v) => { setStatus(v as AlertStatus | ''); setPage(0) }} />
      </div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <SelectFilter
          value={severity}
          onChange={(v) => { setSeverity(v as AlertSeverity | ''); setPage(0) }}
          options={severityOptions}
        />
        <SelectFilter
          value={source}
          onChange={(v) => { setSource(v as AlertSource | ''); setPage(0) }}
          options={sourceOptions}
        />
        {hasFilter && (
          <button
            onClick={() => { setStatus(''); setSeverity(''); setSource(''); setPage(0) }}
            className="text-[12px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            필터 초기화
          </button>
        )}
        <span className="ml-auto text-[11.5px] text-slate-500 font-mono">
          {totalElements.toLocaleString()} 건
        </span>
      </div>

      {error && <Alert className="mb-4">{error}</Alert>}

      {/* 목록 */}
      {loading ? (
        <div className="flex justify-center py-16"><LoadingDots /></div>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((item) => (
            <button
              key={item.notificationId}
              onClick={() => navigate(`/admin/notifications/${item.notificationId}`)}
              className="group relative bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(15,23,42,0.12)] dark:hover:shadow-[0_14px_36px_-14px_rgba(0,0,0,0.55)] rounded-2xl px-5 py-4 flex items-center gap-4 text-left transition-all w-full"
            >
              {/* 심각도 LED */}
              <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full border ${SEVERITY_TONE[item.severity]} flex-shrink-0 uppercase tracking-wider`}>
                {ALERT_SEVERITY_LABEL[item.severity]}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 truncate">{item.title}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono">{item.job}</span>
                  <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full border ${SOURCE_TONE[item.source]}`}>
                    {ALERT_SOURCE_LABEL[item.source]}
                  </span>
                  {item.actionButton && (
                    <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full border bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30">
                      {RESOLUTION_ACTION_LABEL[item.actionButton]}
                    </span>
                  )}
                  {item.actionUserEmail && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-500 truncate max-w-[160px]">
                      처리: {item.actionUserEmail}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_TONE[item.status]}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[item.status]}`} />
                  {ALERT_STATUS_LABEL[item.status]}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{formatDate(item.createdAt)}</span>
              </div>

              <svg className="w-4 h-4 text-slate-300 dark:text-slate-700 group-hover:text-slate-400 dark:group-hover:text-slate-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-7">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
            className="text-[12px] font-medium px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← 이전
          </button>
          <span className="text-[12px] text-slate-500 dark:text-slate-400 font-mono">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
            className="text-[12px] font-medium px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            다음 →
          </button>
        </div>
      )}
    </div>
  )
}

// ── 보조 컴포넌트 ─────────────────────────────────────────────────────────────
function SelectFilter<V extends string>({
  value, onChange, options,
}: {
  value: V
  onChange: (v: V) => void
  options: { value: V; label: string }[]
}) {
  return (
    <AdminSelect
      size="sm"
      value={value}
      onChange={onChange}
      options={options}
    />
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3C7.7 6.2 6 8.4 6 11v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </div>
      <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-200">알림이 없습니다</p>
      <p className="text-[12px] text-slate-500 dark:text-slate-500 mt-1">필터 조건을 바꾸거나 잠시 후 다시 시도해보세요</p>
    </div>
  )
}

function pct(part: number, total: number) {
  if (!total) return '0.0'
  return ((part / total) * 100).toFixed(1)
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return '' }
}
