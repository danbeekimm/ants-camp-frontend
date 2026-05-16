import { useState, useEffect, useMemo } from 'react'
import {
  getCompetitions, createCompetition, updateCompetition, deleteCompetition,
  patchCompetitionStatus, finalizeRankings,
  type UpdateCompetitionRequest,
} from '@/services/authApi'
import { useAuthStore } from '@/store/authStore'
import { LoadingDots } from '@/components/ui/Spinner'
import { DateTimePicker } from '@/components/ui/DatePicker'
import { NumberStepper } from '@/components/ui/NumberStepper'
import type { Competition, CompetitionStatus } from '@/types/auth'
import { Alert } from '@/components/ui/Alert'
import { displayCompetitionName, displayCompetitionSeed } from '@/utils/competition'

const STATUS_LABEL: Record<CompetitionStatus, string> = {
  PREPARING: '준비 중', ONGOING: '진행 중', FINISHED: '종료', CANCELED: '취소',
}
// 칩 클래스 매핑 — index.css 의 chip + chip-* 유틸리티 사용
const STATUS_CHIP: Record<CompetitionStatus, string> = {
  PREPARING: 'chip chip-amber chip-dot',
  ONGOING:   'chip chip-emerald chip-dot',
  FINISHED:  'chip chip-gray',
  CANCELED:  'chip chip-rose chip-dot',
}
const TYPE_LABEL: Record<'PERSONAL' | 'GROUP', string> = { PERSONAL: '개인전', GROUP: '팀전' }

const fmt = (n: number) => n.toLocaleString('ko-KR')

// D-day 계산 — 진행 중 → 종료까지, 준비 중 → 시작까지
function getDDay(comp: Competition): { label: string; color: 'amber' | 'indigo' } | null {
  const now = Date.now()
  if (comp.status === 'ONGOING') {
    const days = Math.ceil((new Date(comp.competitionEndAt).getTime() - now) / 86400000)
    return { label: days <= 0 ? '오늘 종료' : `D-${days} 종료`, color: 'amber' }
  }
  if (comp.status === 'PREPARING') {
    const days = Math.ceil((new Date(comp.competitionStartAt).getTime() - now) / 86400000)
    if (days <= 0) return { label: 'D-DAY 시작', color: 'indigo' }
    if (days <= 60) return { label: `D-${days} 시작`, color: 'indigo' }
  }
  return null
}

type FormData = {
  name: string; type: string; description: string; firstSeed: number
  registerStartAt: string; registerEndAt: string
  competitionStartAt: string; competitionEndAt: string
  minParticipants: number; maxParticipants: number
}

const BLANK_FORM: FormData = {
  name: '', type: 'PERSONAL', description: '', firstSeed: 10_000_000,
  registerStartAt: '', registerEndAt: '',
  competitionStartAt: '', competitionEndAt: '',
  minParticipants: 2, maxParticipants: 100,
}

function toLocalDT(iso: string) {
  if (!iso) return ''
  return iso.slice(0, 16) // "YYYY-MM-DDTHH:mm"
}

function toISO(local: string) {
  return local ? local + ':00' : ''
}

interface ChangeSnapshot {
  name:               string
  description:        string
  registerStartAt:    string
  registerEndAt:      string
  competitionStartAt: string
  competitionEndAt:   string
  minParticipants:    number
  maxParticipants:    number
}

// 변경 공지에 기록될 사람이 읽기 좋은 요약 텍스트 생성
function formatChangeSnapshot(s: ChangeSnapshot): string {
  const dt = (iso: string) => iso ? iso.replace('T', ' ').slice(0, 16) : '-'
  return [
    `대회명: ${s.name}`,
    `설명: ${s.description || '-'}`,
    `신청기간: ${dt(s.registerStartAt)} ~ ${dt(s.registerEndAt)}`,
    `대회기간: ${dt(s.competitionStartAt)} ~ ${dt(s.competitionEndAt)}`,
    `참가인원: ${s.minParticipants} ~ ${s.maxParticipants}명`,
  ].join('\n')
}

// 폼 검증 — 백엔드 BusinessException 메시지가 응답 body 에 안 실려서
// 사용자에게 친절한 메시지를 보여주기 위해 사전에 잡는다.
function validateForm(f: FormData): string | null {
  const rs = f.registerStartAt, re = f.registerEndAt
  const cs = f.competitionStartAt, ce = f.competitionEndAt
  if (!rs || !re || !cs || !ce) return '모든 일정 필드를 입력해주세요.'
  if (rs >= re) return '신청 시작일은 신청 종료일보다 이전이어야 합니다.'
  if (re >= cs) return '신청 종료일은 대회 시작일보다 이전이어야 합니다.'
  if (cs >= ce) return '대회 시작일은 대회 종료일보다 이전이어야 합니다.'
  const minP = Number(f.minParticipants), maxP = Number(f.maxParticipants)
  if (!Number.isFinite(minP) || minP < 1) return '최소 참가 인원은 1명 이상이어야 합니다.'
  if (!Number.isFinite(maxP) || maxP < minP) return '최대 참가 인원은 최소 인원 이상이어야 합니다.'
  if (!Number.isFinite(Number(f.firstSeed)) || Number(f.firstSeed) <= 0) return '시작 자산은 0보다 큰 숫자여야 합니다.'
  if (!f.name.trim()) return '대회 이름을 입력해주세요.'
  return null
}

// ── 상태별 가능 액션 매트릭스 ─────────────────────────────────────────────
type Action = 'publications' | 'starts' | 'finishes' | 'cancellations'

const ACTION_LABEL: Record<Action, string> = {
  publications:  '공개',
  starts:        '시작',
  finishes:      '종료',
  cancellations: '취소',
}

const ALLOWED_ACTIONS: Record<CompetitionStatus, Action[]> = {
  PREPARING: ['publications', 'starts', 'cancellations'],
  ONGOING:   ['finishes', 'cancellations'],
  FINISHED:  [],
  CANCELED:  [],
}

// ── 폼 입력 ────────────────────────────────────────────────────────────
const inputCls = 'w-full bg-white border border-slate-200 dark:bg-gray-800 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500 transition-colors'

type FormChangeHandler = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void

interface FormFieldsProps {
  values: FormData & { reason?: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (k: any) => FormChangeHandler
  showReason?: boolean
}

function Field({ label, hint, children, span }: { label: string; hint?: string; children: React.ReactNode; span?: boolean }) {
  return (
    <div className={span ? 'sm:col-span-2' : undefined}>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</label>
        {hint && <span className="text-[10px] text-gray-600">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function FormFields({ values, onChange, showReason = false }: FormFieldsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="대회 이름" span>
        <input placeholder="예: 2026 1분기 메이저 대회" value={values.name} onChange={onChange('name')} required className={inputCls} />
      </Field>
      <Field label="설명" span>
        <textarea placeholder="대회 소개·규칙 등 자유 형식" value={values.description} onChange={onChange('description')} rows={2}
          className={`${inputCls} resize-none`} />
      </Field>
      <Field label="시작 자산" hint="원">
        <NumberStepper
          value={Number(values.firstSeed) || 0}
          onChange={(v) => onChange('firstSeed')({ target: { value: String(v) } } as React.ChangeEvent<HTMLInputElement>)}
          min={0}
          step={1_000}
          width={140}
          placeholder="예: 10000000"
          required
          ariaLabel="시작 자산"
        />
      </Field>
      <Field label="참가 인원" hint="최소 ~ 최대">
        <div className="flex gap-2 items-center">
          <NumberStepper
            value={Number(values.minParticipants) || 0}
            onChange={(v) => onChange('minParticipants')({ target: { value: String(v) } } as React.ChangeEvent<HTMLInputElement>)}
            min={1}
            step={1}
            width={60}
            placeholder="최소"
            required
            ariaLabel="최소 참가 인원"
          />
          <span className="text-gray-500 text-xs">~</span>
          <NumberStepper
            value={Number(values.maxParticipants) || 0}
            onChange={(v) => onChange('maxParticipants')({ target: { value: String(v) } } as React.ChangeEvent<HTMLInputElement>)}
            min={1}
            step={1}
            width={60}
            placeholder="최대"
            required
            ariaLabel="최대 참가 인원"
          />
        </div>
      </Field>
      {([
        ['registerStartAt',    '신청 시작'],
        ['registerEndAt',      '신청 종료'],
        ['competitionStartAt', '대회 시작'],
        ['competitionEndAt',   '대회 종료'],
      ] as const).map(([k, label]) => (
        <Field key={k} label={label}>
          <DateTimePicker
            value={values[k]}
            onChange={(v) => onChange(k)({ target: { value: v } } as React.ChangeEvent<HTMLInputElement>)}
            required
            ariaLabel={label}
          />
        </Field>
      ))}
      {showReason && (
        <Field label="변경 사유" hint="필수 — 변경공지에 기록됨" span>
          <input
            placeholder="예: 일정 조정으로 인한 신청기간 변경"
            value={values.reason ?? ''}
            onChange={onChange('reason')}
            required
            minLength={2}
            className={inputCls}
          />
        </Field>
      )}
    </div>
  )
}

export function AdminCompetitionPage() {
  const { token, user } = useAuthStore()
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [loading,      setLoading]      = useState(true)
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  // 생성 폼
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<FormData>(BLANK_FORM)

  // 수정 폼
  const [editTarget, setEditTarget] = useState<Competition | null>(null)
  const [editForm,   setEditForm]   = useState<FormData & { reason?: string }>(BLANK_FORM)

  // 필터 / 검색
  const [filter, setFilter] = useState<CompetitionStatus | ''>('')
  const [query,  setQuery]  = useState('')

  const load = () => {
    setLoading(true)
    getCompetitions({ size: 100 })
      .then(setCompetitions)
      .catch(() => setError('목록 로드 실패'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  // ── 생성 ─────────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    const v = validateForm(createForm)
    if (v) { setError(v); return }
    setSubmitting(true); setError(null)
    try {
      await createCompetition({
        ...createForm,
        registerStartAt:    toISO(createForm.registerStartAt),
        registerEndAt:      toISO(createForm.registerEndAt),
        competitionStartAt: toISO(createForm.competitionStartAt),
        competitionEndAt:   toISO(createForm.competitionEndAt),
      }, token!)
      setShowCreate(false); setCreateForm(BLANK_FORM); load()
    } catch (e: unknown) {
      setError(`생성 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`)
    } finally { setSubmitting(false) }
  }

  // ── 수정 ─────────────────────────────────────────────────────────────────
  const openEdit = (c: Competition) => {
    setEditTarget(c)
    setEditForm({
      name:               c.name,
      type:               'PERSONAL',
      description:        c.description,
      firstSeed:          c.firstSeed,
      registerStartAt:    toLocalDT(c.registerStartAt),
      registerEndAt:      toLocalDT(c.registerEndAt),
      competitionStartAt: toLocalDT(c.competitionStartAt),
      competitionEndAt:   toLocalDT(c.competitionEndAt),
      minParticipants:    c.minParticipants,
      maxParticipants:    c.maxParticipants,
      reason:             '',
    })
    setError(null)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget || submitting) return
    const v = validateForm(editForm)
    if (v) { setError(v); return }
    if (!editForm.reason?.trim()) { setError('변경 사유를 입력해주세요. (필수)'); return }
    setSubmitting(true); setError(null)
    try {
      // 변경 전/후 핵심 필드 직렬화 — 백엔드는 변경 공지에 이 내용을 사용
      const before = formatChangeSnapshot({
        name:               editTarget.name,
        description:        editTarget.description,
        registerStartAt:    editTarget.registerStartAt,
        registerEndAt:      editTarget.registerEndAt,
        competitionStartAt: editTarget.competitionStartAt,
        competitionEndAt:   editTarget.competitionEndAt,
        minParticipants:    editTarget.minParticipants,
        maxParticipants:    editTarget.maxParticipants,
      })
      const after = formatChangeSnapshot({
        name:               editForm.name,
        description:        editForm.description,
        registerStartAt:    toISO(editForm.registerStartAt),
        registerEndAt:      toISO(editForm.registerEndAt),
        competitionStartAt: toISO(editForm.competitionStartAt),
        competitionEndAt:   toISO(editForm.competitionEndAt),
        minParticipants:    Number(editForm.minParticipants),
        maxParticipants:    Number(editForm.maxParticipants),
      })

      const req: UpdateCompetitionRequest = {
        name:               editForm.name,
        description:        editForm.description,
        registerStartAt:    toISO(editForm.registerStartAt),
        registerEndAt:      toISO(editForm.registerEndAt),
        competitionStartAt: toISO(editForm.competitionStartAt),
        competitionEndAt:   toISO(editForm.competitionEndAt),
        minParticipants:    Number(editForm.minParticipants),
        maxParticipants:    Number(editForm.maxParticipants),
        beforeContents:     before,
        afterContents:      after,
        reason:             editForm.reason?.trim() || '',
        updatedBy:          user?.name ?? user?.email,
      }
      await updateCompetition(editTarget.competitionId, req, token!)
      setEditTarget(null); load()
    } catch (e: unknown) {
      setError(`수정 저장 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`)
    } finally { setSubmitting(false) }
  }

  // ── 상태 변경 / 삭제 ─────────────────────────────────────────────────────
  const handleStatus = async (id: string, action: Action) => {
    setError(null)
    try { await patchCompetitionStatus(id, action, token!); load() }
    catch (e: unknown) { setError(`'${ACTION_LABEL[action]}' 전환 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`) }
  }

  const handleFinalize = async (id: string) => {
    if (!confirm('최종 순위를 확정하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return
    setError(null)
    try { await finalizeRankings(id); setError(null); alert('순위가 확정되었습니다.') }
    catch (e: unknown) { setError(`순위 확정 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('대회를 삭제하시겠습니까?')) return
    setError(null)
    try { await deleteCompetition(id, token!); load() }
    catch (e: unknown) { setError(`삭제 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`) }
  }

  // ── 폼 필드 헬퍼 ──────────────────────────────────────────────────────────
  const cf = (k: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setCreateForm((p) => ({ ...p, [k]: e.target.value }))

  const ef = (k: keyof typeof editForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setEditForm((p) => ({ ...p, [k]: e.target.value }))

  // 통계 — 상태별 카운트
  const counts = useMemo(() => {
    const c: Record<CompetitionStatus, number> = { PREPARING: 0, ONGOING: 0, FINISHED: 0, CANCELED: 0 }
    competitions.forEach((x) => { c[x.status] += 1 })
    return c
  }, [competitions])

  // 진행 중 대회 총 참가 인원
  const ongoingRegisters = useMemo(
    () => competitions.filter((c) => c.status === 'ONGOING').reduce((s, c) => s + (c.currentRegisters ?? 0), 0),
    [competitions],
  )

  // 준비 중 대회 중 가장 빠른 시작 D-day
  const nextPreparingDDay = useMemo(() => {
    const list = competitions.filter((c) => c.status === 'PREPARING')
    if (!list.length) return null
    const now = Date.now()
    const days = Math.min(...list.map((c) => Math.ceil((new Date(c.competitionStartAt).getTime() - now) / 86400000)))
    if (!Number.isFinite(days)) return null
    return days <= 0 ? 'D-DAY' : `D-${days}`
  }, [competitions])

  // 종료된 대회 평균 참가 인원
  const finishedAvg = useMemo(() => {
    const list = competitions.filter((c) => c.status === 'FINISHED')
    if (!list.length) return 0
    return Math.round(list.reduce((s, c) => s + (c.currentRegisters ?? 0), 0) / list.length)
  }, [competitions])

  // 필터 + 검색 적용
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return competitions.filter((c) => {
      if (filter && c.status !== filter) return false
      if (!q) return true
      return c.name.toLowerCase().includes(q) || c.competitionId.toLowerCase().includes(q)
    })
  }, [competitions, filter, query])

  return (
    <div>
      {/* 브레드크럼 */}
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-2">
        <span>관리자</span>
        <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
        </svg>
        <span className="text-gray-300 font-medium">대회 관리</span>
      </div>

      {/* 타이틀 + 액션 */}
      <div className="flex items-end justify-between mb-5 gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-100">대회 관리</h1>
          {!loading && (
            <p className="text-xs text-gray-500 mt-1">
              전체 {competitions.length}개 대회
              {counts.ONGOING > 0 && <> · 진행 중 {counts.ONGOING}</>}
              {counts.PREPARING > 0 && <> · 준비 중 {counts.PREPARING}</>}
            </p>
          )}
        </div>
        <button onClick={() => { setShowCreate(!showCreate); setError(null) }}
          className="text-xs px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          대회 추가
        </button>
      </div>

      {/* 통계 카드 4개 */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="kicker">전체</span>
            </div>
            <p className="text-xl font-bold font-mono text-gray-100">{competitions.length}</p>
            <p className="text-[10px] text-gray-500 mt-1">등록된 대회</p>
          </div>

          <div
            className="rounded-xl p-4"
            style={{
              background: 'linear-gradient(135deg, var(--emerald-soft) 0%, var(--gray-900) 70%)',
              border: '1px solid var(--emerald-bd)',
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="kicker" style={{ color: 'var(--emerald-text)' }}>진행 중</span>
              <span className="chip chip-emerald chip-dot" style={{ fontSize: 9, padding: '0 6px' }}>LIVE</span>
            </div>
            <p className="text-xl font-bold font-mono" style={{ color: 'var(--emerald-text)' }}>{counts.ONGOING}</p>
            <p className="text-[10px] mt-1" style={{ color: 'var(--emerald-text)' }}>총 참가 {fmt(ongoingRegisters)}명</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="kicker">준비 중</span>
              <span className="chip chip-amber" style={{ fontSize: 9, padding: '0 6px' }}>예정</span>
            </div>
            <p className="text-xl font-bold font-mono text-gray-100">{counts.PREPARING}</p>
            <p className="text-[10px] text-gray-500 mt-1">
              {nextPreparingDDay ? `가장 빠른 시작 ${nextPreparingDDay}` : '예정된 시작 없음'}
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="kicker">종료</span>
              <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <p className="text-xl font-bold font-mono text-gray-100">{counts.FINISHED}</p>
            <p className="text-[10px] text-gray-500 mt-1">
              {finishedAvg > 0 ? `평균 참가 ${fmt(finishedAvg)}명` : '집계 없음'}
            </p>
          </div>
        </div>
      )}

      {/* 필터 / 검색 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 mb-4 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 pl-1 pr-2 border-r border-gray-800">
          <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
          </svg>
          <span className="text-[10px] font-medium text-gray-500">필터</span>
        </div>

        {(['', 'PREPARING', 'ONGOING', 'FINISHED', 'CANCELED'] as const).map((s) => {
          const active = filter === s
          return (
            <button
              key={s || 'all'}
              onClick={() => setFilter(s)}
              className="chip transition-colors"
              style={
                active
                  ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
                  : { background: 'var(--gray-950)', color: 'var(--gray-400)', borderColor: 'var(--border)' }
              }
            >
              {s === '' ? '전체' : STATUS_LABEL[s]}
            </button>
          )
        })}

        <div className="flex-1" />

        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="대회명 · ID 검색"
            className="bg-gray-900 border border-gray-800 rounded-lg pl-7 pr-2 py-1.5 text-xs text-gray-100 placeholder:text-gray-600 outline-none focus:border-indigo-500 w-56 transition-colors"
          />
        </div>
      </div>

      {error && (
        <Alert className="mb-4">{error}</Alert>
      )}

      {/* 생성 폼 */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white border border-indigo-200 dark:bg-gray-900 dark:border-indigo-800/40 rounded-2xl p-5 mb-5 flex flex-col gap-3">
          <h3 className="text-sm font-bold text-gray-100">새 대회</h3>
          <FormFields values={createForm} onChange={cf} />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowCreate(false)} className="text-xs px-4 py-2 text-gray-400 hover:text-gray-200">취소</button>
            <button type="submit" disabled={submitting} className="text-xs px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50">
              {submitting ? '생성 중...' : '생성'}
            </button>
          </div>
        </form>
      )}

      {/* 수정 모달 — 헤더 / 본문 / 풋터 3섹션 */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditTarget(null) }}
        >
          <form
            onSubmit={handleUpdate}
            className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
          >
            {/* 헤더 */}
            <div
              className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-gray-100">대회 수정</h3>
                <p className="text-[11px] text-gray-500 mt-0.5 truncate">{editTarget.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-100 hover:bg-gray-800/60 transition-colors flex-shrink-0"
                aria-label="닫기"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* 본문 */}
            <div className="px-5 py-4 overflow-y-auto flex flex-col gap-3">
              <FormFields values={editForm} onChange={ef} showReason />
              {error && <Alert>{error}</Alert>}
            </div>

            {/* 풋터 */}
            <div
              className="px-5 py-3 flex items-center justify-between gap-3 flex-shrink-0"
              style={{ borderTop: '1px solid var(--border)', background: 'var(--gray-950)' }}
            >
              <span className="text-[11px] text-gray-500">변경 사유는 대회 변경 공지에 자동 기록됩니다</span>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="text-xs px-4 py-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800/60 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="text-xs px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors disabled:opacity-50"
                >
                  {submitting ? '수정 중...' : '수정 저장'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 목록 */}
      {loading ? (
        <div className="flex justify-center py-16"><LoadingDots /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-10 text-gray-600 text-sm">
          {competitions.length === 0
            ? '대회가 없습니다.'
            : '조건에 맞는 대회가 없습니다.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((c) => {
            const dday      = getDDay(c)
            const ddayColor = dday?.color === 'amber' ? 'var(--amber-text)' : 'var(--accent-text)'
            const editable  = c.status !== 'FINISHED' && c.status !== 'CANCELED'
            const canceled  = c.status === 'CANCELED'
            return (
              <div
                key={c.competitionId}
                className="row-card bg-gray-900 border border-gray-800 rounded-xl p-4"
                style={canceled ? { background: 'linear-gradient(180deg, var(--rose-soft) 0%, var(--gray-900) 30%)' } : undefined}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={STATUS_CHIP[c.status]}>{STATUS_LABEL[c.status] ?? '—'}</span>
                      <span className="chip chip-slate">{TYPE_LABEL[c.type] ?? '개인전'}</span>
                      <span className="text-[11px] text-gray-500">{fmt(c.currentRegisters ?? 0)}명 참가</span>
                      {dday && (
                        <>
                          <span className="text-[11px] text-gray-600">·</span>
                          <span className="text-[11px] font-medium" style={{ color: ddayColor }}>{dday.label}</span>
                        </>
                      )}
                    </div>
                    <p className="text-[15px] font-semibold text-gray-100 truncate">{displayCompetitionName(c.name)}</p>
                    <p className="text-[11px] text-gray-500 font-mono mt-1">
                      {c.competitionStartAt?.slice(0, 10) || '—'} ~ {c.competitionEndAt?.slice(0, 10) || '—'}
                      <span className="ml-3 text-gray-600">시드 ₩{displayCompetitionSeed(c.firstSeed)}</span>
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => editable && openEdit(c)}
                      disabled={!editable}
                      title={editable ? undefined : '종료되었거나 취소된 대회는 수정할 수 없습니다.'}
                      className="text-[11px] px-2.5 py-1.5 rounded-md text-gray-400 hover:bg-gray-800/60 hover:text-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400 flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                      </svg>
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(c.competitionId)}
                      className="text-[11px] px-2.5 py-1.5 rounded-md text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
                      style={{ background: 'transparent' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--rose-soft)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"/>
                      </svg>
                      삭제
                    </button>
                  </div>
                </div>

                {/* 상태 전환 — 취소/종료 대회는 표시 안 함 */}
                {!canceled && ALLOWED_ACTIONS[c.status].length > 0 && (
                  <div
                    className="flex items-center gap-1.5 pt-3 mt-3 flex-wrap"
                    style={{ borderTop: '1px solid var(--border-soft)' }}
                  >
                    <span className="kicker mr-1">상태</span>
                    {(['publications', 'starts', 'finishes', 'cancellations'] as const).map((action) => {
                      const matrixOk     = ALLOWED_ACTIONS[c.status].includes(action)
                      const startBlocked = action === 'starts' && c.currentRegisters < c.minParticipants
                      const enabled      = matrixOk && !startBlocked
                      if (!matrixOk) return null
                      const danger = action === 'cancellations'
                      const disabledTitle = startBlocked
                        ? `최소 참가자 수(${c.minParticipants}명) 미달 — 현재 ${c.currentRegisters}명`
                        : undefined
                      return (
                        <button
                          key={action}
                          onClick={() => handleStatus(c.competitionId, action)}
                          disabled={!enabled}
                          title={enabled ? undefined : disabledTitle}
                          className={`text-[11px] px-2.5 py-1 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            danger
                              ? 'text-rose-400 hover:bg-rose-500/10'
                              : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-100'
                          }`}
                        >
                          {ACTION_LABEL[action]}
                        </button>
                      )
                    })}
                  </div>
                )}
                {c.status === 'FINISHED' && (
                  <div className="pt-3 mt-3 flex justify-end" style={{ borderTop: '1px solid var(--border-soft)' }}>
                    <button
                      onClick={() => handleFinalize(c.competitionId)}
                      className="text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition-colors"
                      style={{
                        background: 'linear-gradient(135deg, var(--amber-soft), color-mix(in srgb, var(--amber) 12%, transparent))',
                        border: '1px solid var(--amber-bd)',
                        color: 'var(--amber-text)',
                      }}
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
                      </svg>
                      순위 확정
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}