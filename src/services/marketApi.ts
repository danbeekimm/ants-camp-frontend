export interface MarketItem {
  symbol:        string
  label:         string
  price:         number
  change:        number
  changePercent: number
  closes:        number[]   // 5일 종가 (sparkline용)
}

const SYMBOLS = [
  { symbol: '^KS11',    label: 'KOSPI'   },
  { symbol: '^KQ11',    label: 'KOSDAQ'  },
  { symbol: '^DJI',     label: 'DOW'     },
  { symbol: '^IXIC',    label: 'NASDAQ'  },
  { symbol: '^GSPC',    label: 'S&P500'  },
  { symbol: '^N225',    label: '니케이'  },
  { symbol: '^HSCE',    label: '홍콩H'   },
  { symbol: 'USDKRW=X', label: '원/달러' },
  { symbol: 'USDJPY=X', label: '엔/달러' },
]

export const MOCK_MARKET: MarketItem[] = [
  { symbol: '^KS11',    label: 'KOSPI',   price: 2650.42,  change:  12.35, changePercent:  0.47, closes: [2620, 2630, 2618, 2638, 2645, 2650] },
  { symbol: '^KQ11',    label: 'KOSDAQ',  price:  856.23,  change:  -3.21, changePercent: -0.37, closes: [862,  858,  865,  860,  858,  856] },
  { symbol: '^DJI',     label: 'DOW',     price: 39000.50, change: 150.30, changePercent:  0.39, closes: [38600, 38700, 38650, 38800, 38900, 39000] },
  { symbol: '^IXIC',    label: 'NASDAQ',  price: 16200.80, change: -85.40, changePercent: -0.52, closes: [16400, 16350, 16300, 16280, 16250, 16200] },
  { symbol: '^GSPC',    label: 'S&P500',  price:  5200.10, change:   8.50, changePercent:  0.16, closes: [5180, 5185, 5190, 5188, 5195, 5200] },
  { symbol: '^N225',    label: '니케이',  price: 38500.00, change: 180.50, changePercent:  0.47, closes: [38100, 38200, 38150, 38300, 38400, 38500] },
  { symbol: '^HSCE',    label: '홍콩H',   price:  6800.30, change: -25.20, changePercent: -0.37, closes: [6850, 6840, 6830, 6820, 6810, 6800] },
  { symbol: 'USDKRW=X', label: '원/달러', price:  1340.50, change:   3.20, changePercent:  0.24, closes: [1335, 1336, 1338, 1337, 1339, 1340] },
  { symbol: 'USDJPY=X', label: '엔/달러', price:   151.20, change:   0.45, changePercent:  0.30, closes: [150.5, 150.7, 150.9, 150.8, 151.0, 151.2] },
]

async function fetchOne(symbol: string, label: string): Promise<MarketItem> {
  const encoded = encodeURIComponent(symbol)
  const res = await fetch(`/yahoo/v8/finance/chart/${encoded}?interval=1d&range=7d`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const result = json?.chart?.result?.[0]
  const meta   = result?.meta
  if (!meta) throw new Error('no meta')

  const price  = meta.regularMarketPrice as number
  const prev   = meta.chartPreviousClose as number
  const change = price - prev
  const changePercent = prev !== 0 ? (change / prev) * 100 : 0

  // 5일 종가 추출 (sparkline용)
  const rawCloses: (number | null)[] = result?.indicators?.quote?.[0]?.close ?? []
  const closes = rawCloses.filter((v): v is number => v !== null && v !== undefined).slice(-6)

  return { symbol, label, price, change, changePercent, closes }
}

export async function fetchMarketData(): Promise<MarketItem[]> {
  const results = await Promise.allSettled(
    SYMBOLS.map(({ symbol, label }) => fetchOne(symbol, label))
  )

  const data = results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : MOCK_MARKET[i]
  )

  const allFailed = results.every((r) => r.status === 'rejected')
  return allFailed ? MOCK_MARKET : data
}