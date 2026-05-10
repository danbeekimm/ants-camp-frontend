import { useRef, useState, useEffect } from 'react'
import type { CandleData } from '@/types/stock'

interface Props {
  candles: CandleData[]
  height?: number
  /** true이면 X축에 날짜(MMDD), false이면 시간(HH:mm) 표시 */
  showDate?: boolean
}

const PAD = { top: 12, right: 8, bottom: 40, left: 68 }
const VOLUME_RATIO = 0.22   // 하단 볼륨 영역 비율
const MIN_CANDLE_W = 4
const MAX_CANDLE_W = 16

const fmt = (n: number) => n.toLocaleString('ko-KR')

function xLabel(c: CandleData, showDate: boolean) {
  if (showDate) {
    // YYYYMMDD → MM/DD
    const d = c.date
    return `${d.slice(4, 6)}/${d.slice(6, 8)}`
  }
  // HHmmss → HH:mm
  const t = c.time.padStart(6, '0')
  return `${t.slice(0, 2)}:${t.slice(2, 4)}`
}

/** 가격 Y축 눈금 생성 */
function priceTicks(min: number, max: number, count = 5): number[] {
  const range = max - min
  const raw = range / (count - 1)
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = Math.ceil(raw / mag) * mag
  const start = Math.floor(min / step) * step
  const ticks: number[] = []
  for (let v = start; v <= max + step; v += step) ticks.push(v)
  return ticks.slice(0, count + 2)
}

export function CandleChart({ candles, height = 280, showDate = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  const [tooltip, setTooltip] = useState<{ candle: CandleData; x: number; y: number } | null>(null)

  // 반응형 너비
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  if (candles.length === 0) {
    return (
      <div className="flex items-center justify-center h-28 text-gray-600 text-sm">
        캔들 데이터가 없습니다
      </div>
    )
  }

  // ── 레이아웃 계산 ──────────────────────────────────────────────────────
  const innerW = width  - PAD.left - PAD.right
  const innerH = height - PAD.top  - PAD.bottom
  const volumeH = innerH * VOLUME_RATIO
  const priceH  = innerH - volumeH - 6   // 6px gap

  const candleW = Math.min(MAX_CANDLE_W, Math.max(MIN_CANDLE_W,
    Math.floor(innerW / candles.length) - 2))
  const step = innerW / candles.length

  // ── 가격 범위 ──────────────────────────────────────────────────────────
  const highs  = candles.map((c) => c.high)
  const lows   = candles.map((c) => c.low)
  const maxP = Math.max(...highs)
  const minP = Math.min(...lows)
  const pPad = (maxP - minP) * 0.05 || maxP * 0.005
  const pMax = maxP + pPad
  const pMin = minP - pPad

  const priceToY = (p: number) =>
    PAD.top + priceH - ((p - pMin) / (pMax - pMin)) * priceH

  // ── 볼륨 범위 ─────────────────────────────────────────────────────────
  const maxVol = Math.max(...candles.map((c) => c.volume), 1)
  const volTop = PAD.top + priceH + 6
  const volToH = (v: number) => (v / maxVol) * volumeH

  const candleX = (i: number) => PAD.left + i * step + step / 2

  // ── 가격 눈금 ──────────────────────────────────────────────────────────
  const ticks = priceTicks(pMin, pMax, 5).filter((t) => t >= pMin && t <= pMax)

  // ── X축 레이블 (최대 8개) ──────────────────────────────────────────────
  const xLabelCount = Math.min(8, candles.length)
  const xLabelIndices = candles.length <= xLabelCount
    ? candles.map((_, i) => i)
    : Array.from({ length: xLabelCount }, (_, i) =>
        Math.round((i * (candles.length - 1)) / (xLabelCount - 1)))

  return (
    <div ref={containerRef} className="w-full relative select-none">
      <svg
        width={width}
        height={height}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* ── 배경 그리드 ────────────────────────────────────────────── */}
        {ticks.map((tick) => {
          const y = priceToY(tick)
          return (
            <g key={tick}>
              <line
                x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y}
                stroke="#1f2937" strokeWidth={1}
              />
              <text
                x={PAD.left - 6} y={y + 4}
                textAnchor="end" fontSize={10} fill="#6b7280"
                fontFamily="monospace"
              >
                {fmt(tick)}
              </text>
            </g>
          )
        })}

        {/* ── 캔들 + 볼륨 ──────────────────────────────────────────── */}
        {candles.map((c, i) => {
          const isUp   = c.close >= c.open
          const color  = isUp ? '#f87171' : '#60a5fa'     // 양봉=빨강 음봉=파랑
          const bodyY  = priceToY(Math.max(c.open, c.close))
          const bodyH  = Math.max(1, priceToY(Math.min(c.open, c.close)) - bodyY)
          const wickX  = candleX(i)
          const vH     = volToH(c.volume)

          return (
            <g
              key={i}
              onMouseEnter={(e) => {
                const rect = containerRef.current?.getBoundingClientRect()
                if (!rect) return
                setTooltip({
                  candle: c,
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                })
              }}
            >
              {/* 위꼬리 */}
              <line
                x1={wickX} y1={priceToY(c.high)}
                x2={wickX} y2={bodyY}
                stroke={color} strokeWidth={1}
              />
              {/* 몸통 */}
              <rect
                x={wickX - candleW / 2}
                y={bodyY}
                width={candleW}
                height={bodyH}
                fill={color}
                opacity={0.9}
              />
              {/* 아래꼬리 */}
              <line
                x1={wickX} y1={bodyY + bodyH}
                x2={wickX} y2={priceToY(c.low)}
                stroke={color} strokeWidth={1}
              />
              {/* 볼륨 바 */}
              <rect
                x={wickX - candleW / 2}
                y={volTop + volumeH - vH}
                width={candleW}
                height={vH}
                fill={color}
                opacity={0.4}
              />
            </g>
          )
        })}

        {/* ── X축 레이블 ────────────────────────────────────────────── */}
        {xLabelIndices.map((i) => (
          <text
            key={i}
            x={candleX(i)}
            y={height - PAD.bottom + 14}
            textAnchor="middle"
            fontSize={10}
            fill="#6b7280"
            fontFamily="monospace"
          >
            {xLabel(candles[i], showDate)}
          </text>
        ))}

        {/* ── Y축 구분선 ────────────────────────────────────────────── */}
        <line
          x1={PAD.left} y1={PAD.top}
          x2={PAD.left} y2={PAD.top + innerH}
          stroke="#374151" strokeWidth={1}
        />
        {/* 가격/볼륨 구분선 */}
        <line
          x1={PAD.left} y1={volTop}
          x2={PAD.left + innerW} y2={volTop}
          stroke="#1f2937" strokeWidth={1} strokeDasharray="3 3"
        />

        {/* ── 툴팁 수직선 ──────────────────────────────────────────── */}
        {tooltip && (
          <line
            x1={tooltip.x} y1={PAD.top}
            x2={tooltip.x} y2={PAD.top + innerH}
            stroke="#6366f1" strokeWidth={1} strokeDasharray="4 2"
          />
        )}
      </svg>

      {/* ── 툴팁 카드 ────────────────────────────────────────────────── */}
      {tooltip && (() => {
        const c = tooltip.candle
        const isUp = c.close >= c.open
        const col = isUp ? 'text-red-400' : 'text-blue-400'
        const left = tooltip.x + 12 + 140 > width ? tooltip.x - 152 : tooltip.x + 12
        return (
          <div
            className="absolute pointer-events-none bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono shadow-xl z-10"
            style={{ top: tooltip.y - 10, left }}
          >
            <p className="text-gray-400 mb-1">
              {xLabel(c, showDate)}
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              <span className="text-gray-500">시가</span>
              <span className={col}>{fmt(c.open)}</span>
              <span className="text-gray-500">고가</span>
              <span className="text-red-300">{fmt(c.high)}</span>
              <span className="text-gray-500">저가</span>
              <span className="text-blue-300">{fmt(c.low)}</span>
              <span className="text-gray-500">종가</span>
              <span className={col}>{fmt(c.close)}</span>
              <span className="text-gray-500">거래량</span>
              <span className="text-gray-300">{fmt(c.volume)}</span>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
