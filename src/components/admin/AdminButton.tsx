import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
}

// 관리자 페이지 공용 버튼.
// primary 는 다크 모드에서 흰색·라이트 모드에서 검정색 (Stripe·Vercel 풍).
const VARIANT: Record<Variant, string> = {
  primary:
    'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 shadow-sm',
  secondary:
    'bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700',
  ghost:
    'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60',
  danger:
    'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 hover:bg-rose-100 dark:hover:bg-rose-500/25',
}

const SIZE: Record<Size, string> = {
  sm: 'text-[12px] font-medium px-3 py-1.5 rounded-lg gap-1.5',
  md: 'text-[13.5px] font-semibold px-4 py-2.5 rounded-xl gap-1.5',
}

export function AdminButton({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${VARIANT[variant]} ${SIZE[size]} ${className}`}
    >
      {icon}
      {children}
    </button>
  )
}
