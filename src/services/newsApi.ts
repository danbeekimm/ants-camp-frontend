export interface NewsItem {
  title:        string
  description:  string
  link:         string
  originallink: string
  pubDate:      string
  source:       string
}

function strip(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}

function extractSource(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

export type NewsTab = '증시' | '코스피' | '코스닥' | '환율·금리'

export const NEWS_QUERIES: Record<NewsTab, string> = {
  '증시':    '증시 주식',
  '코스피':  '코스피',
  '코스닥':  '코스닥',
  '환율·금리': '원달러 환율 금리',
}

export async function fetchNews(query: string, display = 8): Promise<NewsItem[]> {
  const params = new URLSearchParams({ query, display: String(display), sort: 'date' })
  const res = await fetch(`/api/naver/news?${params}`)
  if (!res.ok) throw new Error(`뉴스 로드 실패 (${res.status})`)
  const data = await res.json()
  const items: NewsItem[] = (data.items ?? []).map((item: Record<string, string>) => ({
    title:        strip(item.title       ?? ''),
    description:  strip(item.description ?? ''),
    link:         item.link,
    originallink: item.originallink ?? item.link,
    pubDate:      item.pubDate,
    source:       extractSource(item.originallink ?? item.link),
  }))
  // 중복 제거 (originallink 기준)
  const seen = new Set<string>()
  return items.filter((i) => {
    if (seen.has(i.originallink)) return false
    seen.add(i.originallink)
    return true
  })
}

export function fmtPubDate(pubDate: string): string {
  try {
    const d = new Date(pubDate)
    const now = Date.now()
    const diff = now - d.getTime()
    if (diff < 60_000)   return '방금 전'
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}분 전`
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}시간 전`
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  } catch { return '' }
}