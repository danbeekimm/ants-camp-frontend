import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

// =============================================================================
// 숫자 입력 스테퍼
//
//  - 라이트(민트) / 다크(사이버 네온) 두 톤 분기 — Tailwind dark: 클래스 기반.
//  - 평소에는 input 만 보이고, hover / focus-within 시 화살표 영역이
//    width 0 → 24px, opacity 0 → 1 로 슬라이드 인.
//  - 네이티브 스피너는 type="text" + inputMode="numeric" 로 원천 차단
//    (브라우저별 스피너 표시 차이를 우회하면서 leading-zero 패딩도 지원).
//  - 키보드 ↑/↓ 로 step 만큼 증감. 직접 입력 후 blur 시 min/max 보정.
// =============================================================================

export interface NumberStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** 자릿수 패딩 (예: 2 → '09') — 표시에만 사용, 내부 값은 number 유지 */
  pad?: number
  /** input 너비(px). 화살표 영역은 별도로 24px 추가됨. */
  width?: number
  ariaLabel?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  pad,
  width = 50,
  ariaLabel,
  placeholder,
  required,
  disabled,
  className,
}: NumberStepperProps) {
  const formatDisplay = useCallback(
    (n: number) => (pad ? String(n).padStart(pad, '0') : String(n)),
    [pad],
  )

  const [text, setText] = useState<string>(() => formatDisplay(value))
  const composing = useRef(false)
  const focused = useRef(false)

  // 외부 value 변경 시 입력칸 동기화 — IME 조합 중이거나 포커스 중에는 덮어쓰지 않음
  useEffect(() => {
    if (composing.current || focused.current) return
    setText(formatDisplay(value))
  }, [value, formatDisplay])

  const clamp = useCallback(
    (n: number) => {
      if (min !== undefined && n < min) return min
      if (max !== undefined && n > max) return max
      return n
    },
    [min, max],
  )

  const canInc = !disabled && (max === undefined || value < max)
  const canDec = !disabled && (min === undefined || value > min)

  const bump = (delta: number) => {
    const next = clamp(value + delta)
    if (next !== value) onChange(next)
    // 입력칸이 포커스 상태일 때는 useEffect 동기화가 막혀 있으므로
    // 버튼 클릭에 따른 표시 갱신을 여기서 직접 처리한다.
    setText(formatDisplay(next))
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    // 숫자/소수점/음수 부호 외 문자는 무시
    if (v !== '' && v !== '-' && !/^-?\d*\.?\d*$/.test(v)) return
    setText(v)
    if (v === '' || v === '-' || v === '.') return
    const n = Number(v)
    if (!Number.isFinite(n)) return
    onChange(clamp(n))
  }

  const onInputBlur = () => {
    focused.current = false
    const n = Number(text)
    if (!Number.isFinite(n) || text === '' || text === '-') {
      setText(formatDisplay(value))
      return
    }
    const corrected = clamp(n)
    if (corrected !== value) onChange(corrected)
    setText(formatDisplay(corrected))
  }

  const onInputFocus = () => {
    focused.current = true
  }

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      bump(step)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      bump(-step)
    }
  }

  return (
    <div
      className={`
        group relative inline-flex items-stretch overflow-hidden
        rounded-[8px] transition-all duration-200
        bg-white dark:bg-white/[0.04]
        border-[0.5px] border-[#E5E7EB] dark:border-white/10
        hover:border-[#14B8A6] dark:hover:border-cyan-400
        focus-within:border-[#14B8A6] dark:focus-within:border-cyan-400
        hover:shadow-[0_0_0_3px_rgba(20,184,166,0.10)]
        focus-within:shadow-[0_0_0_3px_rgba(20,184,166,0.10)]
        dark:hover:shadow-[0_0_0_3px_rgba(6,182,212,0.20),0_0_16px_rgba(6,182,212,0.30)]
        dark:focus-within:shadow-[0_0_0_3px_rgba(6,182,212,0.20),0_0_16px_rgba(6,182,212,0.30)]
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
        ${className ?? ''}
      `}
      style={{ backdropFilter: 'blur(20px)' }}
    >
      <input
        type="text"
        inputMode="numeric"
        value={text}
        onChange={onInputChange}
        onBlur={onInputBlur}
        onFocus={onInputFocus}
        onKeyDown={onInputKey}
        onCompositionStart={() => { composing.current = true }}
        onCompositionEnd={() => { composing.current = false }}
        aria-label={ariaLabel}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        style={{ width }}
        className="
          px-2.5 py-2 text-[15px] font-bold font-mono text-center
          bg-transparent border-none outline-none
          text-[#0F172A] dark:text-white
          placeholder:text-slate-400 dark:placeholder:text-white/40
          [appearance:textfield]
          [&::-webkit-outer-spin-button]:appearance-none
          [&::-webkit-inner-spin-button]:appearance-none
          [&::-webkit-inner-spin-button]:m-0
        "
      />

      <div
        className="
          flex flex-col overflow-hidden flex-shrink-0
          border-l-[0.5px] border-[#E5E7EB] dark:border-white/[0.08]
          bg-[#F0FDFA] dark:bg-[rgba(6,182,212,0.08)]
          w-0 group-hover:w-6 group-focus-within:w-6
          opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
          transition-[opacity,width] duration-200 ease-out
        "
      >
        <button
          type="button"
          tabIndex={-1}
          disabled={!canInc}
          onMouseDown={(e) => { e.preventDefault(); bump(step) }}
          aria-label="증가"
          className="
            flex-1 flex items-center justify-center
            border-b-[0.5px] border-[#BBF7D0] dark:border-white/[0.08]
            hover:bg-[rgba(20,184,166,0.10)] dark:hover:bg-[rgba(6,182,212,0.15)]
            disabled:opacity-30 disabled:cursor-not-allowed
            disabled:hover:bg-transparent
            transition-colors
          "
        >
          <ChevronUp
            className="w-3 h-3 text-[#14B8A6] dark:text-cyan-400"
            aria-hidden="true"
            strokeWidth={2.5}
          />
        </button>
        <button
          type="button"
          tabIndex={-1}
          disabled={!canDec}
          onMouseDown={(e) => { e.preventDefault(); bump(-step) }}
          aria-label="감소"
          className="
            flex-1 flex items-center justify-center
            hover:bg-[rgba(20,184,166,0.10)] dark:hover:bg-[rgba(6,182,212,0.15)]
            disabled:opacity-30 disabled:cursor-not-allowed
            disabled:hover:bg-transparent
            transition-colors
          "
        >
          <ChevronDown
            className="w-3 h-3 text-[#14B8A6] dark:text-cyan-400"
            aria-hidden="true"
            strokeWidth={2.5}
          />
        </button>
      </div>
    </div>
  )
}
