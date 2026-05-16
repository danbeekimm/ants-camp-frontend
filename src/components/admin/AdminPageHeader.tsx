import type { ReactNode } from 'react'

// 관리자 페이지 공통 상단 헤더
// kicker (작은 대문자) + 큰 타이틀 + 설명 + 우측 액션
// 모든 list/메인 페이지가 동일한 톤을 갖도록 통일.
//
// kicker 가 string 이면 영문 대문자/트래킹/인디고 톤으로 렌더 (기본).
// kicker 가 ReactNode 면 자체 스타일을 그대로 살리고 wrapper 의 mb 만 적용
// — 한글 breadcrumb 같은 케이스에 사용.
interface Props {
  kicker?: ReactNode
  title: string
  subtitle?: string
  action?: ReactNode
  meta?: ReactNode
}

export function AdminPageHeader({ kicker, title, subtitle, action, meta }: Props) {
  return (
    <header className="mb-7 flex items-start justify-between gap-6">
      <div className="min-w-0 flex-1">
        {kicker && (typeof kicker === 'string'
          ? (
            <p className="text-[10.5px] font-bold tracking-[0.18em] text-indigo-600 dark:text-indigo-400 uppercase mb-2.5">
              {kicker}
            </p>
          )
          : <div className="mb-2.5">{kicker}</div>
        )}
        <h1 className="text-[32px] leading-[1.05] font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-2.5 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
        {meta && <div className="mt-3">{meta}</div>}
      </div>
      {action && <div className="flex-shrink-0 pt-1">{action}</div>}
    </header>
  )
}
