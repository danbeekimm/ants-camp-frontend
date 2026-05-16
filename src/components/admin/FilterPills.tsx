interface Option<V extends string> {
  value: V
  label: string
  count?: number
}

interface Props<V extends string> {
  options: Option<V>[]
  value: V
  onChange: (v: V) => void
}

// 카테고리·상태 등 단일 선택 필터를 pill 형태로 표시.
// 선택된 항목은 짙은 배경 + 흰 글씨, 나머지는 보더만.
export function FilterPills<V extends string>({ options, value, onChange }: Props<V>) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={
              active
                ? 'text-[12px] font-medium px-3 py-1.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 transition-colors'
                : 'text-[12px] font-medium px-3 py-1.5 rounded-full bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 transition-colors'
            }
          >
            {o.label}
            {o.count !== undefined && (
              <span className={`ml-1.5 font-mono text-[11px] ${active ? 'opacity-60' : 'text-slate-400 dark:text-slate-500'}`}>
                {o.count.toLocaleString()}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
