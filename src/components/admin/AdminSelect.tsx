import {
  useState,
  useRef,
  useEffect,
  useId,
  useCallback,
  useMemo,
  type ReactNode,
  type KeyboardEvent,
} from 'react'
import { Check, ChevronDown } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// 관리자 패널 공용 커스텀 셀렉트
//
// 윈도우 기본 select 대신 사이트 톤(slate + indigo)과 다크모드에 맞춘 드롭다운.
// FilterPills · DatePicker 와 톤을 맞추기 위해 동일 팔레트를 사용한다.
//
//  size:
//    - "sm"  → rounded-full pill 형태 (목록 필터 줄에 어울림)
//    - "md"  → rounded-xl (기본 입력 필드 톤. 폼 사이드바·필터바 어디든 OK)
//
//  - 외부 클릭 / Esc 닫힘
//  - ↑/↓/Home/End 로 항목 이동, Enter 로 선택, Esc 로 닫기
//  - 옵션이 많아도 max-h + overflow-y-auto 로 스크롤
//  - value 가 옵션에 없으면 placeholder(또는 첫 옵션 label) 표시
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminSelectOption<V extends string = string> {
  value: V
  label: ReactNode
  /** 모노스페이스 (모델명 등) 로 표시 */
  mono?: boolean
  /** 비활성화 */
  disabled?: boolean
}

interface Props<V extends string> {
  value: V
  onChange: (v: V) => void
  options: AdminSelectOption<V>[]
  placeholder?: string
  size?: 'sm' | 'md'
  className?: string
  /** 트리거 최소 너비 (예: "w-[150px]") */
  widthClass?: string
  ariaLabel?: string
  disabled?: boolean
}

export function AdminSelect<V extends string>({
  value,
  onChange,
  options,
  placeholder,
  size = 'md',
  className,
  widthClass,
  ariaLabel,
  disabled,
}: Props<V>) {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState<number>(-1)

  const id = useId()
  const listboxId = `${id}-listbox`

  const wrapperRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // 외부 클릭 / Esc 로 닫힘
  useEffect(() => {
    if (!open) return
    const onMouse = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const t = setTimeout(() => document.addEventListener('mousedown', onMouse), 0)
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', onMouse)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  )

  // 열릴 때 현재 선택된 항목을 하이라이트하고 해당 위치로 스크롤
  useEffect(() => {
    if (!open) return
    const idx = options.findIndex((o) => o.value === value)
    setHover(idx >= 0 ? idx : 0)
    // 다음 tick 에 스크롤 (DOM 마운트 후)
    requestAnimationFrame(() => {
      if (!listRef.current) return
      const el = listRef.current.querySelector<HTMLElement>(
        `[data-idx="${idx >= 0 ? idx : 0}"]`,
      )
      el?.scrollIntoView({ block: 'nearest' })
    })
  }, [open, options, value])

  const moveHover = useCallback(
    (delta: number) => {
      setHover((prev) => {
        const len = options.length
        if (!len) return -1
        let next = prev
        for (let i = 0; i < len; i++) {
          next = (next + delta + len) % len
          if (!options[next].disabled) break
        }
        // 스크롤 동기화
        requestAnimationFrame(() => {
          const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${next}"]`)
          el?.scrollIntoView({ block: 'nearest' })
        })
        return next
      })
    },
    [options],
  )

  const handleTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); moveHover(1) }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); moveHover(-1) }
    else if (e.key === 'Home')      { e.preventDefault(); setHover(0) }
    else if (e.key === 'End')       { e.preventDefault(); setHover(options.length - 1) }
    else if (e.key === 'Enter')     {
      e.preventDefault()
      const opt = options[hover]
      if (opt && !opt.disabled) {
        onChange(opt.value)
        setOpen(false)
      }
    }
  }

  // ── 사이즈별 트리거 스타일 ───────────────────────────────────────────────
  const triggerBase =
    'inline-flex items-center justify-between gap-2 ' +
    'bg-white dark:bg-slate-900/70 ' +
    'border border-slate-200 dark:border-slate-800 ' +
    'text-slate-700 dark:text-slate-200 ' +
    'hover:border-slate-300 dark:hover:border-slate-700 ' +
    'transition-colors outline-none ' +
    'disabled:opacity-50 disabled:cursor-not-allowed'

  const triggerSize =
    size === 'sm'
      ? 'text-[12.5px] font-medium pl-3.5 pr-2.5 py-1.5 rounded-full'
      : 'text-[13px] font-medium pl-3.5 pr-2.5 py-2 rounded-xl'

  const triggerFocus = open
    ? 'border-indigo-500 dark:border-indigo-400 ring-4 ring-indigo-100 dark:ring-indigo-500/15'
    : 'focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-100 dark:focus-visible:ring-indigo-500/15'

  const triggerLabel = selected?.label ?? placeholder ?? ''
  const isPlaceholder = !selected

  return (
    <div
      ref={wrapperRef}
      className={`relative ${widthClass ?? 'inline-block'} ${className ?? ''}`}
    >
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleTriggerKey}
        className={`${triggerBase} ${triggerSize} ${triggerFocus} ${widthClass ? 'w-full' : ''}`}
      >
        <span
          className={`truncate ${isPlaceholder ? 'text-slate-400 dark:text-slate-500' : ''} ${
            selected?.mono ? "font-mono" : ''
          }`}
          style={selected?.mono ? { fontFamily: "'JetBrains Mono', monospace" } : undefined}
        >
          {triggerLabel}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 flex-shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-150 ${
            open ? 'rotate-180 text-indigo-500 dark:text-indigo-400' : ''
          }`}
          strokeWidth={2.25}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-activedescendant={hover >= 0 ? `${id}-opt-${hover}` : undefined}
          className="
            absolute z-50 mt-1.5 left-0 min-w-full
            max-h-[280px] overflow-y-auto
            rounded-xl p-1
            bg-white dark:bg-slate-900
            border border-slate-200 dark:border-slate-800
            shadow-[0_12px_32px_-12px_rgba(15,23,42,0.18)]
            dark:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)]
            outline-none
          "
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-[12.5px] text-slate-400 dark:text-slate-500 text-center">
              항목이 없습니다
            </li>
          ) : (
            options.map((opt, i) => {
              const isSelected = opt.value === value
              const isHover = i === hover
              const isDisabled = !!opt.disabled
              return (
                <li
                  key={opt.value}
                  id={`${id}-opt-${i}`}
                  data-idx={i}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={isDisabled || undefined}
                  onMouseEnter={() => !isDisabled && setHover(i)}
                  onMouseDown={(e) => {
                    // button blur 방지 — 클릭 한 번에 선택되도록
                    e.preventDefault()
                  }}
                  onClick={() => {
                    if (isDisabled) return
                    onChange(opt.value)
                    setOpen(false)
                  }}
                  className={[
                    'flex items-center justify-between gap-2',
                    'text-[13px] px-2.5 py-2 rounded-lg cursor-pointer select-none',
                    'transition-colors',
                    isDisabled
                      ? 'opacity-40 cursor-not-allowed'
                      : isHover
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200'
                        : isSelected
                          ? 'text-slate-900 dark:text-slate-100'
                          : 'text-slate-700 dark:text-slate-300',
                  ].join(' ')}
                >
                  <span
                    className={`truncate ${isSelected ? 'font-semibold' : ''} ${opt.mono ? 'font-mono' : ''}`}
                    style={opt.mono ? { fontFamily: "'JetBrains Mono', monospace" } : undefined}
                  >
                    {opt.label}
                  </span>
                  {isSelected && (
                    <Check
                      className="w-3.5 h-3.5 flex-shrink-0 text-indigo-600 dark:text-indigo-300"
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                  )}
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}
