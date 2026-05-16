import { Search } from 'lucide-react'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}

// Stripe 풍 검색 입력 — 좌측 돋보기 아이콘, focus 시 옅은 인디고 ring.
export function AdminSearchInput({ value, onChange, placeholder = '검색', className = '' }: Props) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-[13.5px] pl-10 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/10 transition-all"
      />
    </div>
  )
}
