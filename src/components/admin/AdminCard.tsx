import type { ReactNode } from 'react'

// 관리자 패널·박스 공용 카드. 헤더(라벨 + 우측 슬롯) + 본문.
// 본문 padding 은 noPadding 으로 끌 수 있음 (textarea 같은 전체-폭 콘텐츠용).
interface Props {
  label?: ReactNode
  right?: ReactNode
  children: ReactNode
  noPadding?: boolean
  className?: string
}

export function AdminCard({ label, right, children, noPadding, className = '' }: Props) {
  return (
    <section
      className={`bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden ${className}`}
    >
      {(label || right) && (
        <div className="px-5 py-3 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800/60">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {label}
          </span>
          {right && <div className="text-[11px] text-slate-500 dark:text-slate-400">{right}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </section>
  )
}
