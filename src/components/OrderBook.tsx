import type { OrderBookData } from '@/types/stock'

interface Props {
  data: OrderBookData
}

const fmt = (n: number) => n.toLocaleString('ko-KR')

/** 호가별 막대 너비 계산 (최대 수량 대비 %) */
function barWidth(qty: number, maxQty: number): string {
  if (maxQty === 0) return '0%'
  return `${Math.min((qty / maxQty) * 100, 100).toFixed(1)}%`
}

export function OrderBook({ data }: Props) {
  const topAsks = [...data.asks].slice(0, 5).reverse() // 5호가 → 1호가 (위→아래)
  const topBids = data.bids.slice(0, 5)                // 1호가 → 5호가 (위→아래)

  const maxQty = Math.max(
    ...topAsks.map((a) => a.qty),
    ...topBids.map((b) => b.qty),
    1,
  )

  return (
    <div className="font-mono text-xs">
      {/* 헤더 */}
      <div className="grid grid-cols-3 text-gray-500 pb-1 border-b border-gray-700 mb-1">
        <span className="text-right pr-2">잔량</span>
        <span className="text-center">호가</span>
        <span className="text-left pl-2">잔량</span>
      </div>

      {/* 매도호가 (빨강) */}
      {topAsks.map((level, i) => (
        <div key={`ask-${i}`} className="grid grid-cols-3 items-center h-7 relative">
          {/* 배경 막대 */}
          <div
            className="absolute right-1/2 top-0.5 bottom-0.5 bg-red-950 rounded-sm"
            style={{ width: barWidth(level.qty, maxQty), right: '50%' }}
          />
          <span className="relative text-right pr-2 text-red-400 z-10">
            {fmt(level.qty)}
          </span>
          <span className="relative text-center text-red-300 font-semibold z-10">
            {fmt(level.price)}
          </span>
          <span className="relative pl-2 z-10" />
        </div>
      ))}

      {/* 구분선 */}
      <div className="border-t border-dashed border-gray-700 my-1" />

      {/* 매수호가 (파랑) */}
      {topBids.map((level, i) => (
        <div key={`bid-${i}`} className="grid grid-cols-3 items-center h-7 relative">
          <div
            className="absolute left-1/2 top-0.5 bottom-0.5 bg-blue-950 rounded-sm"
            style={{ width: barWidth(level.qty, maxQty) }}
          />
          <span className="relative z-10" />
          <span className="relative text-center text-blue-300 font-semibold z-10">
            {fmt(level.price)}
          </span>
          <span className="relative text-left pl-2 text-blue-400 z-10">
            {fmt(level.qty)}
          </span>
        </div>
      ))}

      {/* 요약 */}
      <div className="border-t border-gray-700 mt-1 pt-2 grid grid-cols-2 gap-1">
        <div className="text-right text-red-400 text-[11px]">
          매도 {fmt(data.totalAskQty)}
        </div>
        <div className="text-left text-blue-400 text-[11px]">
          매수 {fmt(data.totalBidQty)}
        </div>
      </div>
    </div>
  )
}
