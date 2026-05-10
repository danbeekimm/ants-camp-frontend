import { create } from 'zustand'
import type { SubscribedStock, StockPriceData, OrderBookData } from '@/types/stock'

const MAX_HISTORY = 60 // 최대 60개 체결가 보관 (차트용)

interface StockStore {
  // 구독 중인 종목 맵 (stockCode → SubscribedStock)
  stocks: Record<string, SubscribedStock>

  // 현재 선택(상세 보기) 중인 종목코드
  selectedCode: string | null

  // KIS WebSocket 연결 상태
  kisConnected: boolean

  // STOMP 연결 상태
  stompConnected: boolean

  // 계좌 ID (X-ACCOUNT-ID 헤더에 사용)
  accountId: string

  // 액션
  setAccountId: (id: string) => void
  addStock: (stock: Pick<SubscribedStock, 'stockCode' | 'stockName'>) => void
  removeStock: (stockCode: string) => void
  updatePrice: (data: StockPriceData) => void
  updateOrderBook: (data: OrderBookData) => void
  selectStock: (stockCode: string | null) => void
  setKisConnected: (v: boolean) => void
  setStompConnected: (v: boolean) => void
}

export const useStockStore = create<StockStore>((set) => ({
  stocks: {},
  selectedCode: null,
  kisConnected: false,
  stompConnected: false,
  accountId: '',
  setAccountId: (id) => set({ accountId: id }),

  addStock: ({ stockCode, stockName }) =>
    set((state) => {
      if (state.stocks[stockCode]) return state // 이미 구독 중
      return {
        stocks: {
          ...state.stocks,
          [stockCode]: {
            stockCode,
            stockName,
            price: null,
            orderBook: null,
            priceHistory: [],
            subscribedAt: Date.now(),
          },
        },
        selectedCode: state.selectedCode ?? stockCode,
      }
    }),

  removeStock: (stockCode) =>
    set((state) => {
      const next = { ...state.stocks }
      delete next[stockCode]
      const codes = Object.keys(next)
      return {
        stocks: next,
        selectedCode:
          state.selectedCode === stockCode
            ? (codes[0] ?? null)
            : state.selectedCode,
      }
    }),

  updatePrice: (data) =>
    set((state) => {
      const stock = state.stocks[data.stockCode]
      if (!stock) return state

      const hh = data.tradeTime.slice(0, 2)
      const mm = data.tradeTime.slice(2, 4)
      const ss = data.tradeTime.slice(4, 6)
      const timeLabel = `${hh}:${mm}:${ss}`

      const newHistory = [
        ...stock.priceHistory,
        { time: timeLabel, price: data.currentPrice },
      ].slice(-MAX_HISTORY)

      return {
        stocks: {
          ...state.stocks,
          [data.stockCode]: { ...stock, price: data, priceHistory: newHistory },
        },
      }
    }),

  updateOrderBook: (data) =>
    set((state) => {
      const stock = state.stocks[data.stockCode]
      if (!stock) return state
      return {
        stocks: {
          ...state.stocks,
          [data.stockCode]: { ...stock, orderBook: data },
        },
      }
    }),

  selectStock: (stockCode) => set({ selectedCode: stockCode }),
  setKisConnected: (v) => set({ kisConnected: v }),
  setStompConnected: (v) => set({ stompConnected: v }),
}))
