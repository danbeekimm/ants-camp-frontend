interface SparklineProps {
  closes: number[]
  up: boolean
  width?: number
  height?: number
}

export function Sparkline({ closes, up, width = 40, height = 20 }: SparklineProps) {
  if (closes.length < 2) return <div style={{ width, height }} />

  const min   = Math.min(...closes)
  const max   = Math.max(...closes)
  const range = max - min || 1

  const pts = closes.map((v, i) => {
    const x = (i / (closes.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 2) - 1
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const color = up ? '#10b981' : '#ef4444'
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="flex-shrink-0">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}