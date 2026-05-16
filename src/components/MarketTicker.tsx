import { useEffect, useRef, useState, cloneElement } from 'react'
import { Client } from '@stomp/stompjs'
import { fetchMarketData, MOCK_MARKET, type MarketItem } from '@/services/marketApi'
import { useTickerStore } from '@/store/tickerStore'
import { TICKER_STOCKS } from '@/config/stocks'
import { Sparkline } from '@/components/ui/Sparkline'
import type { StockPriceData } from '@/types/stock'

const INDEX_ORDER = ['^KS11', '^KQ11', 'USDKRW=X', '^IXIC', '^GSPC']

function fmtPrice(n: number, decimals = 2) {
  return n.toLocaleString('ko-KR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// ── 지수 카드 ─────────────────────────────────────────────────────────────────
function IndexCard({ item }: { item: MarketItem }) {
  const up      = item.changePercent > 0
  const down    = item.changePercent < 0
  const color   = up ? '#ef4444' : down ? '#3b82f6' : '#6b7280'
  const bgBadge = up ? 'rgba(239,68,68,0.12)' : down ? 'rgba(59,130,246,0.12)' : 'rgba(107,114,128,0.12)'
  const arrow   = up ? '▲' : down ? '▼' : '━'

  return (
    <div
      className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl flex-shrink-0 cursor-default select-none transition-all duration-150 hover:-translate-y-0.5"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] font-medium text-gray-500">{item.label}</span>
        <span className="text-[12px] font-bold text-gray-100 font-mono">
          {fmtPrice(item.price, item.label === '원/달러' ? 2 : item.price > 1000 ? 0 : 2)}
        </span>
      </div>
      <Sparkline closes={item.closes} up={up || !down} />
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap"
        style={{ background: bgBadge, color }}>
        {arrow} {Math.abs(item.changePercent).toFixed(2)}%
      </span>
    </div>
  )
}

// ── 실시간 종목 아이템 ────────────────────────────────────────────────────────
function StockItem({ name, data }: { name: string; data: StockPriceData | null }) {
  const up    = data ? data.changeRate > 0 : false
  const down  = data ? data.changeRate < 0 : false
  const color = up ? '#ef4444' : down ? '#3b82f6' : '#9ca3af'
  const arrow = up ? '▲' : down ? '▼' : '━'
  const bgBadge = up ? 'rgba(239,68,68,0.12)' : down ? 'rgba(59,130,246,0.12)' : 'rgba(107,114,128,0.1)'

  return (
    <span className="inline-flex items-center gap-2 px-3 border-r border-gray-800/50 flex-shrink-0">
      <span className="text-[11px] font-semibold text-gray-300">{name}</span>
      {data ? (
        <>
          <span className="text-[11px] font-mono font-bold text-gray-100">
            {data.currentPrice.toLocaleString()}
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
            style={{ background: bgBadge, color }}>
            {arrow} {Math.abs(data.changeRate).toFixed(2)}%
          </span>
        </>
      ) : (
        /* 스켈레톤 */
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-14 rounded bg-gray-800 animate-pulse" />
          <span className="h-2.5 w-10 rounded bg-gray-800 animate-pulse" />
        </span>
      )}
    </span>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export function MarketTicker() {
  const { prices: stockPrices, setPrice, setIndexData: storeSetIndex } = useTickerStore()
  const [indexData, setIndexData] = useState<MarketItem[]>(MOCK_MARKET)
  const [paused, setPaused]           = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [secSince, setSecSince]       = useState(0)
  const stompRef = useRef<Client | null>(null)

  useEffect(() => {
    const token   = localStorage.getItem('accessToken')
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
    TICKER_STOCKS.forEach(({ code }) => {
      fetch(`/api/trades/realtime/${code}`, { method: 'POST', headers }).catch(() => {})
    })
    const wsUrl = window.location.protocol === 'https:'
      ? `wss://${window.location.host}/ws-stomp`
      : `ws://${window.location.host}/ws-stomp`
    const client = new Client({
      brokerURL: wsUrl, reconnectDelay: 5000,
      onConnect: () => {
        TICKER_STOCKS.forEach(({ code }) => {
          client.subscribe(`/topic/price/${code}`, (msg) => {
            try { setPrice(JSON.parse(msg.body) as StockPriceData) } catch {}
          })
        })
      },
    })
    client.activate()
    stompRef.current = client
    return () => {
      client.deactivate()
      TICKER_STOCKS.forEach(({ code }) => {
        fetch(`/api/trades/realtime/${code}`, { method: 'DELETE', headers }).catch(() => {})
      })
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      const data = await fetchMarketData()
      setIndexData(data)
      storeSetIndex(data)
      setLastUpdated(new Date())
    }
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [])

  // 갱신까지 남은 초 카운트다운
  useEffect(() => {
    const id = setInterval(() => {
      if (!lastUpdated) return
      const elapsed = Math.floor((Date.now() - lastUpdated.getTime()) / 1000)
      setSecSince(elapsed)
    }, 1000)
    return () => clearInterval(id)
  }, [lastUpdated])

  const displayIndices = INDEX_ORDER
    .map((sym) => indexData.find((d) => d.symbol === sym))
    .filter((d): d is MarketItem => !!d)

  const stockItems = TICKER_STOCKS.map(({ code, name }) => (
    <StockItem key={code} name={name} data={stockPrices[code] ?? null} />
  ))

  return (
    <div className="bg-gray-950 select-none">

      {/* ── Row 1: 지수 카드형 — 구분선은 내부 max-w 영역에만 ───────── */}
      <div>
        <div
          className="max-w-screen-xl mx-auto px-6 flex items-center gap-2 h-11 overflow-x-auto scrollbar-none"
          style={{ borderBottom: '1px solid var(--border-soft)' }}
        >
          <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mr-1 flex-shrink-0">지수</span>
          {displayIndices.map((item) => <IndexCard key={item.symbol} item={item} />)}
          <span className="text-[11px] text-gray-400 ml-auto flex-shrink-0 hidden sm:block font-mono">
            {secSince > 0 ? `${Math.max(0, 30 - secSince)}초 후 갱신` : '갱신 중...'}
          </span>
        </div>
      </div>

      {/* ── Row 2: 실시간 종목 스크롤 — 하단 구분선도 max-w 안쪽 ───── */}
      <div
        className="max-w-screen-xl mx-auto px-6 flex items-center h-9"
        style={{ borderBottom: '1px solid var(--border-soft)' }}
      >
        <div className="flex-shrink-0 flex items-center gap-1.5 pr-3 border-r border-gray-800 h-full">
          {/* ping 애니메이션 */}
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
          </span>
          <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest">실시간</span>
        </div>

        <div className="flex-1 overflow-hidden h-full flex items-center"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}>
          <div className="flex items-center"
            style={{
              animation: 'ticker-scroll 45s linear infinite',
              animationPlayState: paused ? 'paused' : 'running',
            }}>
            {stockItems}
            {stockItems.map((el, i) => cloneElement(el, { key: `dup-${el.key ?? i}` }))}
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center gap-1.5 pl-3 border-l border-gray-800 h-full">
          {lastUpdated && (
            <span className="text-[9px] text-gray-600 hidden md:block">
              {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => setPaused((p) => !p)}
            title={paused ? '재개' : '일시정지'}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
          >
            {paused ? (
              /* Play 아이콘 */
              <svg width="10" height="11" viewBox="0 0 10 11" fill="currentColor">
                <path d="M2 1.5L8.5 5.5L2 9.5V1.5Z"/>
              </svg>
            ) : (
              /* Pause 아이콘 */
              <svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor">
                <rect x="0.5" y="0.5" width="3" height="9" rx="1"/>
                <rect x="5.5" y="0.5" width="3" height="9" rx="1"/>
              </svg>
            )}
          </button>
        </div>
      </div>

    </div>
  )
}