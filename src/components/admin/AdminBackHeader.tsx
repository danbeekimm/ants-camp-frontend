import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

// 상세·폼 페이지 공용 헤더 (뒤로가기 + 제목 + 우측 액션 + 옵션 부제)
interface Props {
  back: string
  kicker?: string
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
}

export function AdminBackHeader({ back, kicker, title, subtitle, action }: Props) {
  const navigate = useNavigate()
  return (
    <header className="mb-7 flex items-start gap-4">
      <button
        type="button"
        onClick={() => navigate(back)}
        className="mt-1 w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors flex-shrink-0"
        title="뒤로"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.25" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div className="flex-1 min-w-0">
        {kicker && (
          <p className="text-[10.5px] font-bold tracking-[0.18em] text-indigo-600 dark:text-indigo-400 uppercase mb-2">
            {kicker}
          </p>
        )}
        <h1 className="text-[26px] leading-[1.1] font-bold tracking-tight text-slate-900 dark:text-slate-50 truncate">
          {title}
        </h1>
        {subtitle && (
          <div className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5">{subtitle}</div>
        )}
      </div>
      {action && <div className="flex-shrink-0 pt-1">{action}</div>}
    </header>
  )
}
