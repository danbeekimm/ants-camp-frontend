async function unwrap<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!text) throw new Error(`서버 오류 (${res.status})`)
  const json = JSON.parse(text)
  if (!res.ok) throw new Error(json?.message ?? `서버 오류 (${res.status})`)
  return ('data' in json ? json.data : json) as T
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken') ?? ''
  return { Authorization: `Bearer ${token}` }
}

function toQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') q.set(k, String(v))
  }
  const str = q.toString()
  return str ? `?${str}` : ''
}

export type AlertStatus    = 'PENDING' | 'SENT' | 'FAILED' | 'ACTION_FAILED'
export type AlertSeverity  = 'CRITICAL' | 'WARNING' | 'INFO'
export type AlertSource    = 'PROMETHEUS' | 'GRAFANA' | 'APPLICATION'
export type ResolutionAction = 'ROLLBACK' | 'CACHE_CLEAR' | 'RESTART' | 'FALSE_ALARM'

export const ALERT_STATUS_LABEL: Record<AlertStatus, string> = {
  PENDING:       '대기 중',
  SENT:          '전송됨',
  FAILED:        '전송 실패',
  ACTION_FAILED: '액션 실패',
}

export const ALERT_SEVERITY_LABEL: Record<AlertSeverity, string> = {
  CRITICAL: 'CRITICAL',
  WARNING:  'WARNING',
  INFO:     'INFO',
}

export const ALERT_SOURCE_LABEL: Record<AlertSource, string> = {
  PROMETHEUS:  'Prometheus',
  GRAFANA:     'Grafana',
  APPLICATION: 'Application',
}

export const RESOLUTION_ACTION_LABEL: Record<ResolutionAction, string> = {
  ROLLBACK:    '코드 롤백',
  CACHE_CLEAR: '캐시 비우기',
  RESTART:     '서비스 재시작',
  FALSE_ALARM: '정상 처리',
}

export interface NotificationSummary {
  notificationId: string
  job: string
  source: AlertSource
  severity: AlertSeverity
  status: AlertStatus
  title: string
  actionButton: ResolutionAction | null
  actionUserEmail: string | null
  createdAt: string
  updatedAt: string
}

export interface NotificationDetail {
  notificationId: string
  channelId: string
  job: string
  source: AlertSource
  deduplicationKey: string
  severity: AlertSeverity
  status: AlertStatus
  title: string
  content: string
  payload: string | null
  aiAnalysis: string | null
  slackMessageTs: string | null
  actionButton: ResolutionAction | null
  actionUserEmail: string | null
  createdAt: string
  updatedAt: string
}

export interface NotificationPage {
  content: NotificationSummary[]
  totalElements: number
  totalPages: number
  currentPage: number
}

export interface NotificationSearchParams {
  status?: AlertStatus | ''
  severity?: AlertSeverity | ''
  source?: AlertSource | ''
  job?: string
  from?: string
  to?: string
  actionUserEmail?: string
  handledOnly?: boolean
  page?: number
}

export async function listNotifications(params: NotificationSearchParams = {}): Promise<NotificationPage> {
  const res = await fetch(`/api/notifications/admin${toQuery(params as Record<string, string | number | boolean | undefined | null>)}`, {
    headers: authHeaders(),
  })
  return unwrap<NotificationPage>(res)
}

export async function getNotification(notificationId: string): Promise<NotificationDetail> {
  const res = await fetch(`/api/notifications/admin/${notificationId}`, {
    headers: authHeaders(),
  })
  return unwrap<NotificationDetail>(res)
}