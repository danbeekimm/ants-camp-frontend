import { create } from 'zustand'
import type { StockPriceData } from '@/types/stock'
import type { MarketItem } from '@/services/marketApi'
import { fetchStockPriceList } from '@/services/stockApi'

interface TickerStore {
  prices:          Record<string, StockPriceData>
  setPrice:        (data: StockPriceData) => void
  indexData:       MarketItem[]
  setIndexData:    (data: MarketItem[]) => void
  restPrices:      Record<string, number>
  fetchRestPrices: (codes: string[]) => Promise<void>
}

// 여러 컴포넌트(MarketTicker, HotStocksWidget)가 메인 진입 시 같은 종목 현재가를
// 동시에 요청해도 stock-price-list 호출이 1회로 합쳐지도록 진행 중 요청을 공유한다.
// (KIS REST 초당 한도 초과로 인한 500 완화 — docs/stock-price-list-500-debug.md 3순위)
let inFlight: Promise<void> | null = null

export const useTickerStore = create<TickerStore>((set) => ({
  prices:       {},
  indexData:    [],
  restPrices:   {},
  setPrice:     (data) => set((state) => ({ prices: { ...state.prices, [data.stockCode]: data } })),
  setIndexData: (data) => set({ indexData: data }),
  fetchRestPrices: (codes) => {
    if (inFlight) return inFlight
    inFlight = fetchStockPriceList(codes)
      .then((prices) => { set((state) => ({ restPrices: { ...state.restPrices, ...prices } })) })
      .catch(() => { /* 폴백 실패는 무시 — STOMP 실시간 수신 시 갱신됨 */ })
      .finally(() => { inFlight = null })
    return inFlight
  },
}))
