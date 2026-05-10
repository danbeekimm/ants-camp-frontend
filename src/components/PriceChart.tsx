import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { PricePoint } from '@/types/stock'

interface Props {
  data: PricePoint[]
  direction: 'UP' | 'DOWN' | 'FLAT'
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs font-mono">
        <p className="text-gray-100">{payload[0].value.toLocaleString('ko-KR')}원</p>
      </div>
    )
  }
  return null
}

export function PriceChart({ data, direction }: Props) {
  if (data.length < 2) {
    return (
      <div className="h-40 flex items-center justify-center text-gray-600 text-sm">
        체결가 데이터 수집 중...
      </div>
    )
  }

  const strokeColor =
    direction === 'UP' ? '#f87171' : direction === 'DOWN' ? '#60a5fa' : '#818cf8'
  const fillColor =
    direction === 'UP' ? '#991b1b' : direction === 'DOWN' ? '#1e40af' : '#312e81'

  // Y축 도메인: 최소/최대 ±0.5%
  const prices = data.map((d) => d.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const pad = (max - min) * 0.3 || max * 0.001
  const domain: [number, number] = [Math.floor(min - pad), Math.ceil(max + pad)]

  // X축은 6개만 보여주기
  const tickIndices = data.length > 6
    ? Array.from({ length: 6 }, (_, i) => Math.floor((i * (data.length - 1)) / 5))
    : data.map((_, i) => i)
  const tickValues = tickIndices.map((i) => data[i].time)

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={fillColor} stopOpacity={0.8} />
            <stop offset="95%" stopColor={fillColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis
          dataKey="time"
          ticks={tickValues}
          tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={domain}
          tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => v.toLocaleString('ko-KR')}
          width={65}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="price"
          stroke={strokeColor}
          strokeWidth={1.5}
          fill="url(#priceGradient)"
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
