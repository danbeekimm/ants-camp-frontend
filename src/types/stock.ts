// ─── 한투 실시간 체결가 (H0STCNT0) ────────────────────────────────────────
export interface StockPriceData {
  stockCode: string
  tradeTime: string   // HHmmss
  currentPrice: number
  priceChange: number
  changeRate: number
  volume: number
  direction: 'UP' | 'DOWN' | 'FLAT'
}

// ─── 한투 실시간 호가 (H0STASP0) ──────────────────────────────────────────
export interface OrderLevel {
  price: number
  qty: number
}

export interface OrderBookData {
  stockCode: string
  tradeTime: string
  asks: OrderLevel[]   // 매도호가 (index 0 = 1호가, 낮은 가격)
  bids: OrderLevel[]   // 매수호가 (index 0 = 1호가, 높은 가격)
  totalAskQty: number
  totalBidQty: number
}

// ─── 종목 검색 결과 (백엔드 StockSearchResponse 필드 그대로)
export interface StockSearchResult {
  code: string    // 종목코드 (예: "005930")
  name: string    // 종목명  (예: "삼성전자")
  market: string  // "KOSPI" | "KOSDAQ"
}

// ─── 사용자 구독 종목 상태 ─────────────────────────────────────────────────
export interface SubscribedStock {
  stockCode: string
  stockName: string
  price: StockPriceData | null
  orderBook: OrderBookData | null
  priceHistory: PricePoint[]   // 체결가 히스토리 (차트용)
  subscribedAt: number
}

export interface PricePoint {
  time: string       // HH:mm:ss
  price: number
}

// ─── 주문 유형 ─────────────────────────────────────────────────────────────
export type OrderType = 'MARKET' | 'LIMIT'

// ─── 시장가/지정가 주문 요청 ────────────────────────────────────────────────
export interface TradeOrderRequest {
  stockCode: string
  stockAmount: number
  orderType: OrderType
  side: 'BUY' | 'SELL'   // 매수 | 매도
  limitPrice?: number     // 지정가 주문 시 필수, 시장가는 생략
  accountId: string       // 계좌 ID (body로 전달)
}

// ─── 주문 결과 응답 ────────────────────────────────────────────────────────
export interface TradeOrderResponse {
  stockCode: string
  stockName: string
  orderType: OrderType
  side: 'BUY' | 'SELL'
  /** EXECUTED: 즉시 체결 / PENDING: 지정가 미체결 대기 / CANCELLED: 취소 완료 */
  status: 'EXECUTED' | 'PENDING' | 'CANCELLED'
  executedPrice: number   // 주당 체결가 (PENDING 시 현재가)
  totalAmount: number     // 체결 총액 (PENDING/CANCELLED 시 0)
  stockAmount: number
  tradeId?: string        // PENDING 주문 취소 시 사용
  message: string
}

// ─── 미체결 주문 조회 응답 ─────────────────────────────────────────────────
export interface PendingOrderResponse {
  tradeId: string
  stockCode: string
  tradeType: 'BUY' | 'SELL'
  orderType: OrderType
  limitPrice: number
  stockAmount: number
  totalPrice: number
  tradeAt: string
}

// ─── 레거시 매수/매도 (기존 호환용) ───────────────────────────────────────
export interface TradeRequest {
  stockCode: string
  stockAmount: number
}

export interface TradeResponse {
  stockCode: string
  stockName: string
  stockPrice: number
  stockAmount: number
}

// ─── 캔들 데이터 (분봉/일봉/주봉/월봉 공통) ───────────────────────────────
export interface CandleData {
  date: string       // YYYYMMDD
  time: string       // HHmmss (일봉 이상은 빈 문자열)
  open: number       // 시가
  high: number       // 고가
  low: number        // 저가
  close: number      // 종가
  volume: number     // 거래량
}

// ─── Timeframe ─────────────────────────────────────────────────────────────
export type Timeframe = '1m' | '5m' | '15m' | '30m' | '60m' | '1d' | '1w' | '1M'

export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  '1m':  '1분',
  '5m':  '5분',
  '15m': '15분',
  '30m': '30분',
  '60m': '60분',
  '1d':  '일',
  '1w':  '주',
  '1M':  '월',
}

// ─── /api/trades/price 응답 래퍼 ──────────────────────────────────────────
export interface ApiResponse<T> {
  status: number
  code: string
  message: string
  data: T
}

export interface MinutePriceResponse {
  output1: {
    hts_kor_isnm: string   // 종목명
    stck_prpr: string      // 현재가
    prdy_vrss: string      // 전일대비
    prdy_ctrt: string      // 전일대비율
    acml_vol: string       // 누적거래량
  } | null
  output2: Array<{
    stck_bsop_date: string  // 날짜 YYYYMMDD
    stck_cntg_hour: string  // 시간 HHmmss
    stck_prpr: string       // 체결가(종가)
    stck_oprc: string       // 시가
    stck_hgpr: string       // 고가
    stck_lwpr: string       // 저가
    cntg_vol: string        // 체결거래량
  }>
  rt_cd: string
  msg_cd: string
  msg1: string
}
