import { create } from 'zustand'
import type { StockPriceData } from '@/types/stock'
import type { MarketItem } from '@/services/marketApi'

interface TickerStore {
  prices:       Record<string, StockPriceData>
  setPrice:     (data: StockPriceData) => void
  indexData:    MarketItem[]
  setIndexData: (data: MarketItem[]) => void
}

export const useTickerStore = create<TickerStore>((set) => ({
  prices:       {},
  indexData:    [],
  setPrice:     (data) => set((state) => ({ prices: { ...state.prices, [data.stockCode]: data } })),
  setIndexData: (data) => set({ indexData: data }),
}))