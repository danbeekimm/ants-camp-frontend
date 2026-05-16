import { useState, useEffect, useCallback } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { fetchNews, fmtPubDate, NEWS_QUERIES, type NewsItem, type NewsTab } from '@/services/newsApi'

const TABS: NewsTab[] = ['증시', '코스피', '코스닥', '환율·금리']
const FETCH_SIZE = 30
const REFRESH_MS = 10 * 60 * 1000

// ── 카테고리 뱃지 감지 ────────────────────────────────────────────────────────
const STOCK_KEYWORDS = /삼성|sk하이닉스|카카오|네이버|현대차|기아|lg에너지|셀트리온|포스코|롯데|한화|두산|신한|kb금융|하나금융/i

function detectBadge(title: string, pubDate: string): {
  label: string; light: string; dark: string
} {
  const age = Date.now() - new Date(pubDate).getTime()
  if (age < 5 * 60 * 1000)
    return { label: 'HOT', light: 'bg-red-50 text-red-700', dark: 'dark:bg-red-950/40 dark:text-red-300' }

  const t = title
  if (STOCK_KEYWORDS.test(t))                        return { label: '종목',  light: 'bg-orange-50 text-orange-700', dark: 'dark:bg-orange-950/40 dark:text-orange-300' }
  if (/외국인|기관|수급/.test(t))                   return { label: '외국인', light: 'bg-blue-50   text-blue-700',   dark: 'dark:bg-blue-950/40   dark:text-blue-300' }
  if (/규제|법안|금융위|공시|금감원|정책/.test(t)) return { label: '정책',  light: 'bg-purple-50 text-purple-700', dark: 'dark:bg-purple-950/40 dark:text-purple-300' }
  if (/환율|금리|달러|원\/달러|채권/.test(t))      return { label: '환율',  light: 'bg-amber-50  text-amber-700',  dark: 'dark:bg-amber-950/40  dark:text-amber-300' }

  return { label: '일반', light: 'bg-zinc-100 text-zinc-500', dark: 'dark:bg-gray-800 dark:text-gray-400' }
}

function Badge({ label, light, dark }: { label: string; light: string; dark: string }) {
  return (
    <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-md flex-shrink-0 ${light} ${dark}`}>
      {label}
    </span>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
interface NewsFeedProps {
  pageSize?: number
}

export function NewsFeed({ pageSize = 10 }: NewsFeedProps = {}) {
  const PAGE_SIZE = pageSize
  const [tab,     setTab]     = useState<NewsTab>('증시')
  const [items,   setItems]   = useState<NewsItem[]>([])
  const [page,    setPage]    = useState(0)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [lastAt,  setLastAt]  = useState<Date | null>(null)

  const load = useCallback(async (t: NewsTab) => {
    setLoading(true); setError(null); setPage(0)
    try {
      const data = await fetchNews(NEWS_QUERIES[t], FETCH_SIZE)
      setItems(data)
      setLastAt(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : '뉴스를 불러오지 못했습니다')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(tab)
    const id = setInterval(() => load(tab), REFRESH_MS)
    return () => clearInterval(id)
  }, [tab, load])

  const totalPages = Math.ceil(items.length / PAGE_SIZE)
  const pageItems  = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col">

      {/* ── 헤더 ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <h2 className="text-sm font-bold text-gray-100">실시간 증시 뉴스</h2>
        </div>
        <div className="flex items-center gap-2">
          {lastAt && (
            <span className="text-[10px] text-gray-500">
              {lastAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 갱신
            </span>
          )}
          <button onClick={() => load(tab)} disabled={loading}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-40"
            title="새로고침">
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── 탭 ───────────────────────────────────────────────────────────── */}
      <div
        className="flex gap-1 px-4 py-2.5 bg-gray-950 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-soft)' }}
      >
        {TABS.map((t) => (
          <button key={t}
            onClick={() => { setTab(t); setPage(0) }}
            className={`text-[12px] px-3 py-1.5 rounded-lg font-medium transition-all ${
              tab === t
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── 뉴스 목록 (10개) ──────────────────────────────────────────────── */}
      <div className="px-3 py-2 flex-shrink-0">
        {loading ? (
          Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 px-2 py-3 animate-pulse">
              <span className="w-8 h-4 rounded bg-gray-800 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-800 rounded w-4/5" />
                <div className="h-2.5 bg-gray-800 rounded w-1/3" />
              </div>
            </div>
          ))
        ) : error ? (
          <div className="px-2 py-8 text-center flex flex-col items-center gap-2">
            <p className="text-xs text-gray-500 font-medium">뉴스를 불러올 수 없습니다</p>
            <p className="text-[10px] text-gray-700 leading-relaxed">
              <code className="bg-gray-800 px-1 rounded">.env</code>에&nbsp;
              <code className="bg-gray-800 px-1 rounded">NAVER_CLIENT_ID</code> /&nbsp;
              <code className="bg-gray-800 px-1 rounded">NAVER_CLIENT_SECRET</code> 설정 후 재시작
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-600">뉴스가 없습니다</div>
        ) : (
          pageItems.map((item, i) => {
            const badge  = detectBadge(item.title, item.pubDate)
            const isHot  = badge.label === 'HOT'
            const isFirst = page === 0 && i === 0
            return (
              <a key={`${page}-${i}`}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-start gap-2.5 px-2 py-2.5 rounded-xl cursor-pointer group transition-colors ${
                  isFirst && isHot ? 'bg-rose-50/60 hover:bg-rose-100/70 dark:bg-red-950/10 dark:hover:bg-red-950/20' : 'hover:bg-slate-50 dark:hover:bg-gray-800/50'
                }`}>
                <Badge {...badge} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors line-clamp-1 leading-relaxed">
                    {item.title}
                  </p>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] text-gray-500">{item.source}</span>
                    <span className="text-[10px] text-gray-600">{fmtPubDate(item.pubDate)}</span>
                  </div>
                </div>
                <ArrowUpRight size={14} className="flex-shrink-0 mt-0.5 text-gray-700 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
              </a>
            )
          })
        )}
      </div>

      {/* 기사 아래 빈 공간 — 사이드바 높이에 맞춰 채움 */}
      <div className="flex-1" />

      {/* ── 페이지네이션 — 카드 하단 고정 ────────────────────────────────── */}
      {!loading && !error && totalPages > 1 && (
        <div
          className="flex items-center justify-between px-5 py-2.5 flex-shrink-0"
          style={{ borderTop: '1px solid var(--border-soft)' }}
        >
          <button onClick={() => setPage((p) => p - 1)} disabled={page === 0}
            className="text-[11px] text-gray-500 hover:text-gray-200 disabled:text-gray-700 disabled:cursor-not-allowed transition-colors px-2 py-1">
            ← 이전
          </button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} onClick={() => setPage(i)}
                className={`rounded-full transition-all ${
                  i === page ? 'w-4 h-1.5 bg-indigo-500' : 'w-1.5 h-1.5 bg-gray-700 hover:bg-gray-500'
                }`}
              />
            ))}
          </div>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}
            className="text-[11px] text-gray-500 hover:text-gray-200 disabled:text-gray-700 disabled:cursor-not-allowed transition-colors px-2 py-1">
            다음 →
          </button>
        </div>
      )}

    </div>
  )
}