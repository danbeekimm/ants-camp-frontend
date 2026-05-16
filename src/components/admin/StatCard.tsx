import type { ReactNode } from 'react'

// 통계 타일 — 큰 숫자 + 라벨 + 보조 텍스트
// tone 에 따라 우상단에 옅은 색 글로우가 들어감 (Stripe 풍).
type Tone = 'neutral' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'violet' | 'sky'

const TONE: Record<Tone, { label: string; glow: string }> = {
  neutral: { label: 'text-slate-500 dark:text-slate-400', glow: '' },
  emerald: { label: 'text-emerald-700 dark:text-emerald-400', glow: 'bg-emerald-100/60 dark:bg-emerald-500/10' },
  amber:   { label: 'text-amber-700 dark:text-amber-400',     glow: 'bg-amber-100/60 dark:bg-amber-500/10' },
  rose:    { label: 'text-rose-700 dark:text-rose-400',       glow: 'bg-rose-100/60 dark:bg-rose-500/10' },
  indigo:  { label: 'text-indigo-700 dark:text-indigo-300',   glow: 'bg-indigo-100/60 dark:bg-indigo-500/10' },
  violet:  { label: 'text-violet-700 dark:text-violet-300',   glow: 'bg-violet-100/60 dark:bg-violet-500/10' },
  sky:     { label: 'text-sky-700 dark:text-sky-300',         glow: 'bg-sky-100/60 dark:bg-sky-500/10' },
}

interface Props {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: Tone
}

export function StatCard({ label, value, hint, tone = 'neutral' }: Props) {
  const t = TONE[tone]
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
      {t.glow && <div className={`absolute top-0 right-0 w-20 h-20 ${t.glow} rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none`} />}
      <p className={`relative text-[11px] font-medium ${t.label} mb-2`}>{label}</p>
      <p className="relative text-[30px] font-bold leading-none tracking-tight text-slate-900 dark:text-slate-50">
        {value}
      </p>
      {hint && (
        <p className="relative text-[11px] text-slate-400 dark:text-slate-500 mt-3 font-mono">
          {hint}
        </p>
      )}
    </div>
  )
}
