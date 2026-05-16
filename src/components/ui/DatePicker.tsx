import { useState, useRef, useEffect, useId, useMemo, useCallback } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from 'lucide-react'

// =============================================================================
// AntsCamp 통합 날짜·시간 선택 컴포넌트
//
//  - 단일 팝오버: 미리보기 + 월 네비 + 7×6 날짜 그리드 + (옵션) 시간 입력 + 액션
//  - 라이트(민트) / 다크(사이버 네온) 두 톤으로 분기. Tailwind dark: 클래스 기반.
//  - 외부 클릭 / Esc 로 닫힘. 확인 누를 때만 onChange.
//  - 시간은 1분 단위, AM/PM 토글, ↑↓ 키로 ±1.
//
//  외부 API 는 기존(string) 유지:
//    DatePicker     value: "YYYY-MM-DD"
//    DateTimePicker value: "YYYY-MM-DDTHH:mm"
// =============================================================================

// ── 유틸 ─────────────────────────────────────────────────────────────────────
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const pad2 = (n: number) => String(n).padStart(2, '0')

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1) }
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth()    === b.getMonth()
    && a.getDate()     === b.getDate()
}
function fmtDateOnly(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` }
function fmtDateTime(d: Date) { return `${fmtDateOnly(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}` }
function fmtPreview(d: Date, showTime: boolean) {
  const base = `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`
  return showTime ? `${base} ${pad2(d.getHours())}:${pad2(d.getMinutes())}` : base
}

function parseDateOnly(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return isNaN(d.getTime()) ? null : d
}
function parseDateTime(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]))
  return isNaN(d.getTime()) ? null : d
}

// 7×6 = 42칸의 캘린더 셀 (이전·다음 달 포함). 일요일 시작.
function buildMonthGrid(monthAnchor: Date): Date[] {
  const first = startOfMonth(monthAnchor)
  const startOffset = first.getDay() // 0..6
  const start = new Date(first); start.setDate(1 - startOffset)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i); return d
  })
}

// ── 외부 클릭 / Esc 감지 ─────────────────────────────────────────────────────
function useOutsideClose<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!open) return
    const onMouse = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    // 같은 mousedown 이벤트에서 즉시 닫히지 않도록 다음 tick
    const t = setTimeout(() => document.addEventListener('mousedown', onMouse), 0)
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', onMouse)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])
  return ref
}

// ── 트리거 입력칸 ────────────────────────────────────────────────────────────
function TriggerInput({
  id, value, placeholder, open, onClick, ariaLabel, showTime,
}: {
  id: string
  value: Date | null
  placeholder: string
  open: boolean
  onClick: () => void
  ariaLabel?: string
  showTime: boolean
}) {
  return (
    <button
      type="button"
      id={id}
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={onClick}
      className="
        relative w-full text-left font-mono transition-colors duration-200
        flex items-center
        rounded-[10px]
        bg-white dark:bg-white/[0.04]
        border border-[#E5E7EB] dark:border-white/10
        text-slate-900 dark:text-white
        hover:border-teal-400 dark:hover:border-cyan-400/40
        focus:outline-none focus:border-teal-500 dark:focus:border-cyan-400
      "
      style={{ padding: '10px 12px 10px 36px', backdropFilter: 'blur(20px)' }}
    >
      <CalendarIcon
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500 dark:text-cyan-400 pointer-events-none"
        aria-hidden="true"
        strokeWidth={1.75}
      />
      <span className={`text-[13px] truncate ${value ? '' : 'text-slate-400 dark:text-white/40'}`}>
        {value ? fmtPreview(value, showTime) : placeholder}
      </span>
    </button>
  )
}

// ── Picker 본체 ───────────────────────────────────────────────────────────────
interface PickerCoreProps {
  initial: Date
  showTime: boolean
  minDate?: Date
  maxDate?: Date
  onConfirm: (d: Date) => void
  onCancel: () => void
}

function PickerCore({ initial, showTime, minDate, maxDate, onConfirm, onCancel }: PickerCoreProps) {
  // 내부 상태 — 확인 누를 때까지 외부와 분리
  const [draft,        setDraft]        = useState<Date>(initial)
  const [monthAnchor,  setMonthAnchor]  = useState<Date>(initial)
  const [hourInput,    setHourInput]    = useState<string>(pad2(((initial.getHours() + 11) % 12) + 1))
  const [minuteInput,  setMinuteInput]  = useState<string>(pad2(initial.getMinutes()))
  const [period,       setPeriod]       = useState<'AM' | 'PM'>(initial.getHours() < 12 ? 'AM' : 'PM')

  // 월 범위 비활성 판단
  const minMonth = minDate ? startOfMonth(minDate) : null
  const maxMonth = maxDate ? startOfMonth(maxDate) : null
  const canPrev = !minMonth || addMonths(monthAnchor, -1).getTime() >= minMonth.getTime()
  const canNext = !maxMonth || addMonths(monthAnchor,  1).getTime() <= maxMonth.getTime()

  const cells = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor])
  const today = useMemo(() => startOfDay(new Date()), [])

  // 날짜 클릭 → draft 갱신 (시간은 유지)
  const handleSelectDate = (d: Date) => {
    if (minDate && d < startOfDay(minDate)) return
    if (maxDate && d > startOfDay(maxDate)) return
    const next = new Date(d)
    next.setHours(draft.getHours(), draft.getMinutes(), 0, 0)
    setDraft(next)
    if (d.getMonth() !== monthAnchor.getMonth()) setMonthAnchor(startOfMonth(d))
  }

  // 시간 input 헬퍼 — 1~12 / 0~59 범위, 자유 입력 후 blur 시 자동 패딩
  const applyHour = useCallback((hh12: number, prd: 'AM' | 'PM') => {
    const h24 = (hh12 % 12) + (prd === 'PM' ? 12 : 0)
    const next = new Date(draft); next.setHours(h24); setDraft(next)
  }, [draft])

  const applyMinute = useCallback((mm: number) => {
    const next = new Date(draft); next.setMinutes(mm); setDraft(next)
  }, [draft])

  const onHourBlur = () => {
    const n = parseInt(hourInput, 10)
    if (!isNaN(n) && n >= 1 && n <= 12) {
      const v = pad2(n); setHourInput(v); applyHour(n, period)
    } else {
      setHourInput(pad2(((draft.getHours() + 11) % 12) + 1))
    }
  }
  const onMinuteBlur = () => {
    const n = parseInt(minuteInput, 10)
    if (!isNaN(n) && n >= 0 && n <= 59) {
      const v = pad2(n); setMinuteInput(v); applyMinute(n)
    } else {
      setMinuteInput(pad2(draft.getMinutes()))
    }
  }

  const togglePeriod = (next: 'AM' | 'PM') => {
    if (next === period) return
    setPeriod(next)
    const cur = parseInt(hourInput, 10)
    const h12 = !isNaN(cur) && cur >= 1 && cur <= 12 ? cur : ((draft.getHours() + 11) % 12) + 1
    applyHour(h12, next)
  }

  const onHourKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const dir = e.key === 'ArrowUp' ? 1 : -1
      const cur = parseInt(hourInput, 10) || 0
      const next = ((cur - 1 + dir + 12) % 12) + 1
      setHourInput(pad2(next))
      applyHour(next, period)
    }
  }
  const onMinuteKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const dir = e.key === 'ArrowUp' ? 1 : -1
      const cur = parseInt(minuteInput, 10) || 0
      const next = (cur + dir + 60) % 60
      setMinuteInput(pad2(next))
      applyMinute(next)
    }
  }

  // ── 셀 스타일 분기 ──────────────────────────────────────────────────────────
  const cellClass = (d: Date) => {
    const inMonth   = d.getMonth() === monthAnchor.getMonth()
    const selected  = isSameDay(d, draft)
    const isToday   = isSameDay(d, today)
    const dow       = d.getDay()
    const disabled  = (minDate && d < startOfDay(minDate)) || (maxDate && d > startOfDay(maxDate))

    if (selected) {
      // 선택됨 — 라이트: 민트 솔리드, 다크: 시안→바이올렛 그라데이션
      return [
        'text-white font-bold cursor-pointer',
        'bg-[#14B8A6] dark:bg-[image:linear-gradient(135deg,#06B6D4,#A78BFA)]',
        'shadow-[0_4px_12px_rgba(20,184,166,0.4)] dark:shadow-[0_0_16px_rgba(6,182,212,0.5)]',
      ].join(' ')
    }
    const classes: string[] = ['cursor-pointer transition-colors duration-150']
    if (!inMonth) {
      classes.push('text-[#CBD5E1] dark:text-white/20')
    } else if (dow === 0) {
      classes.push('text-[#EF4444] dark:text-[#F472B6]')
    } else if (dow === 6) {
      classes.push('text-[#3B82F6] dark:text-[#67E8F9]')
    } else {
      classes.push('text-[#0F172A] dark:text-white/85')
    }
    if (isToday) {
      classes.push('font-bold bg-[#F0FDFA] dark:bg-cyan-500/20')
    }
    classes.push('hover:bg-[#CCFBF1] dark:hover:bg-white/5')
    if (disabled) classes.push('opacity-40 pointer-events-none')
    return classes.join(' ')
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="날짜 선택"
      className="
        relative w-[340px] overflow-hidden transition-colors duration-300
        rounded-[16px] p-5
        bg-white dark:bg-[#0B0118]
        border border-[#E5E7EB] dark:border-white/10
        shadow-[0_8px_24px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_48px_rgba(0,0,0,0.6)]
      "
    >
      {/* 다크모드 네온 글로우 */}
      <div className="hidden dark:block absolute pointer-events-none"
        style={{ top: -60, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.25) 0%, transparent 70%)', filter: 'blur(30px)' }} />
      <div className="hidden dark:block absolute pointer-events-none"
        style={{ bottom: -60, left: -50, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.20) 0%, transparent 70%)', filter: 'blur(30px)' }} />

      <div className="relative z-10">
        {/* 1. 선택값 미리보기 */}
        <div className="
          flex items-center justify-between gap-3
          rounded-[10px] mb-4
          bg-[#F0FDFA] dark:bg-white/[0.04]
          dark:border dark:border-white/10
          transition-colors duration-300
        " style={{ padding: '12px 14px', backdropFilter: 'blur(20px)' }}>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-wider
                          text-slate-500 dark:text-white/40
                          uppercase mb-0.5">
              {showTime ? '선택됨 · SELECTED' : '선택됨'}
            </p>
            <p className="text-[14px] font-bold font-mono text-slate-900 dark:text-white">
              {fmtPreview(draft, showTime)}
            </p>
          </div>
          {showTime
            ? <Clock className="w-5 h-5 text-[#14B8A6] dark:text-cyan-400 flex-shrink-0" aria-hidden="true" strokeWidth={1.75} />
            : <CalendarIcon className="w-5 h-5 text-[#14B8A6] dark:text-cyan-400 flex-shrink-0" aria-hidden="true" strokeWidth={1.75} />}
        </div>

        {/* 2. 월 네비 */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => canPrev && setMonthAnchor(addMonths(monthAnchor, -1))}
            disabled={!canPrev}
            aria-label="이전 달"
            className="
              w-7 h-7 rounded-md flex items-center justify-center
              text-[#64748B] dark:text-white/70
              hover:bg-[#F1F5F9] dark:bg-white/5 dark:border dark:border-white/10 dark:hover:bg-white/10
              disabled:opacity-30 disabled:cursor-not-allowed
              transition-colors duration-200
            "
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <span className="text-[14px] font-bold text-slate-900 dark:text-white">
            {monthAnchor.getFullYear()}년 {monthAnchor.getMonth() + 1}월
          </span>
          <button
            type="button"
            onClick={() => canNext && setMonthAnchor(addMonths(monthAnchor, 1))}
            disabled={!canNext}
            aria-label="다음 달"
            className="
              w-7 h-7 rounded-md flex items-center justify-center
              text-[#64748B] dark:text-white/70
              hover:bg-[#F1F5F9] dark:bg-white/5 dark:border dark:border-white/10 dark:hover:bg-white/10
              disabled:opacity-30 disabled:cursor-not-allowed
              transition-colors duration-200
            "
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* 3. 요일 헤더 */}
        <div className="grid grid-cols-7 gap-[2px] mb-1.5">
          {WEEKDAYS.map((w, i) => {
            const color =
              i === 0 ? 'text-[#EF4444] dark:text-[#F472B6]'
              : i === 6 ? 'text-[#3B82F6] dark:text-[#67E8F9]'
              : 'text-[#94A3B8] dark:text-white/40'
            return (
              <div key={w} className={`text-center text-[10px] font-bold py-1 ${color}`}>{w}</div>
            )
          })}
        </div>

        {/* 4. 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-[2px] mb-4">
          {cells.map((d, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectDate(d)}
              aria-label={`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`}
              className={`
                aspect-square w-full flex items-center justify-center
                text-[12px] rounded-full select-none
                ${cellClass(d)}
              `}
            >
              {d.getDate()}
            </button>
          ))}
        </div>

        {/* 5. 시간 선택 */}
        {showTime && (
          <div className="
            border-t border-[#F1F5F9] dark:border-white/10
            pt-3.5 mb-3
            transition-colors duration-300
          ">
            <p className="text-[10.5px] font-semibold mb-2 tracking-wider
                          text-[#64748B] dark:text-white/50">
              <span className="dark:hidden">시간</span>
              <span className="hidden dark:inline">TIME</span>
            </p>

            <div className="flex items-center gap-2">
              {/* AM/PM 세그먼트 */}
              <div className="
                inline-flex rounded-lg p-1
                bg-[#F8FAFC] dark:bg-white/5
                dark:border dark:border-white/10
                transition-colors duration-300
              ">
                {(['AM', 'PM'] as const).map((p) => {
                  const active = period === p
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePeriod(p)}
                      className={
                        active
                          ? 'text-[12px] px-3 py-1 rounded-[5px] font-bold transition-colors duration-200 ' +
                            'bg-white text-[#0F172A] shadow-sm ' +
                            'dark:bg-[image:linear-gradient(135deg,#06B6D4,#A78BFA)] dark:text-white dark:shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                          : 'text-[12px] px-3 py-1 rounded-[5px] font-semibold transition-colors duration-200 ' +
                            'bg-transparent text-[#94A3B8] dark:text-white/50 hover:text-[#0F172A] dark:hover:text-white'
                      }
                    >
                      {p}
                    </button>
                  )
                })}
              </div>

              {/* HH:MM */}
              <div className="
                inline-flex items-center gap-0.5
                rounded-lg
                bg-[#F8FAFC] dark:bg-white/5
                dark:border dark:border-white/10
                transition-colors duration-300
              " style={{ padding: '4px 10px' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={hourInput}
                  onChange={(e) => setHourInput(e.target.value.replace(/\D/g, ''))}
                  onFocus={(e) => e.target.select()}
                  onBlur={onHourBlur}
                  onKeyDown={onHourKey}
                  aria-label="시"
                  className="w-6 text-center text-[14px] font-bold font-mono bg-transparent outline-none
                             text-[#0F172A] dark:text-white"
                />
                <span className="text-[14px] font-bold text-[#94A3B8] dark:text-white/50">:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={minuteInput}
                  onChange={(e) => setMinuteInput(e.target.value.replace(/\D/g, ''))}
                  onFocus={(e) => e.target.select()}
                  onBlur={onMinuteBlur}
                  onKeyDown={onMinuteKey}
                  aria-label="분"
                  className="w-6 text-center text-[14px] font-bold font-mono bg-transparent outline-none
                             text-[#0F172A] dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* 6. 액션 버튼 */}
        <div className="flex gap-2 mt-3.5">
          <button
            type="button"
            onClick={onCancel}
            className="
              flex-1 px-3 py-2.5 text-[12px] font-semibold rounded-lg
              bg-white dark:bg-white/5
              text-[#475569] dark:text-white/80
              border border-[#E5E7EB] dark:border-white/10
              hover:bg-[#F8FAFC] dark:hover:bg-white/10
              transition-colors duration-200
            "
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onConfirm(draft)}
            className="
              flex-1 px-3 py-2.5 text-[12px] font-bold rounded-lg text-white
              bg-[#14B8A6] hover:bg-[#0D9488]
              shadow-[0_4px_12px_rgba(20,184,166,0.3)]
              dark:bg-[image:linear-gradient(135deg,#06B6D4,#A78BFA)] dark:shadow-[0_0_16px_rgba(6,182,212,0.4)]
              transition-colors duration-200
            "
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 1. DatePicker (date-only) ───────────────────────────────────────────────
interface DatePickerProps {
  value: string                       // "YYYY-MM-DD" 또는 ""
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  className?: string
  ariaLabel?: string
  minDate?: Date
  maxDate?: Date
}

export function DatePicker({
  value, onChange, placeholder = '날짜 선택', required, className, ariaLabel, minDate, maxDate,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useOutsideClose<HTMLDivElement>(open, () => setOpen(false))
  const id = useId()

  const parsed = parseDateOnly(value)

  const handleConfirm = (d: Date) => {
    onChange(fmtDateOnly(d))
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ''}`}>
      <TriggerInput
        id={id}
        value={parsed}
        placeholder={placeholder}
        open={open}
        onClick={() => setOpen((v) => !v)}
        ariaLabel={ariaLabel}
        showTime={false}
      />

      {required && (
        <input
          tabIndex={-1}
          aria-hidden
          required
          value={value}
          onChange={() => {}}
          style={{ position: 'absolute', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }}
        />
      )}

      {open && (
        <div className="absolute z-50 mt-2 left-0">
          <PickerCore
            initial={parsed ?? new Date()}
            showTime={false}
            minDate={minDate}
            maxDate={maxDate}
            onConfirm={handleConfirm}
            onCancel={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  )
}

// ── 2. DateTimePicker (datetime) ────────────────────────────────────────────
interface DateTimePickerProps {
  value: string                       // "YYYY-MM-DDTHH:mm" 또는 ""
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  className?: string
  ariaLabel?: string
  minDate?: Date
  maxDate?: Date
}

export function DateTimePicker({
  value, onChange, placeholder = '날짜·시간 선택', required, className, ariaLabel, minDate, maxDate,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useOutsideClose<HTMLDivElement>(open, () => setOpen(false))
  const id = useId()

  const parsed = parseDateTime(value)

  const handleConfirm = (d: Date) => {
    onChange(fmtDateTime(d))
    setOpen(false)
  }

  // 초기 시간 — 입력 없으면 09:00 으로 시작
  const initial = parsed ?? (() => {
    const d = new Date()
    d.setHours(9, 0, 0, 0)
    return d
  })()

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ''}`}>
      <TriggerInput
        id={id}
        value={parsed}
        placeholder={placeholder}
        open={open}
        onClick={() => setOpen((v) => !v)}
        ariaLabel={ariaLabel}
        showTime={true}
      />

      {required && (
        <input
          tabIndex={-1}
          aria-hidden
          required
          value={value}
          onChange={() => {}}
          style={{ position: 'absolute', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }}
        />
      )}

      {open && (
        <div className="absolute z-50 mt-2 left-0">
          <PickerCore
            initial={initial}
            showTime={true}
            minDate={minDate}
            maxDate={maxDate}
            onConfirm={handleConfirm}
            onCancel={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  )
}
