interface WinBarProps {
  winA: number
  draw: number
  winB: number
  labelA: string
  labelDraw: string
  labelB: string
}

export function WinBar({ winA, draw, winB, labelA, labelDraw, labelB }: WinBarProps) {
  const total = winA + draw + winB
  if (total === 0) return <p className="text-xs text-gray-500">데이터 없음</p>

  const pctA    = (winA / total) * 100
  const pctDraw = (draw / total) * 100
  const pctB    = (winB / total) * 100

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-8 rounded-xl overflow-hidden">
        {pctA > 0 && (
          <div className="bg-indigo-600 flex items-center justify-center transition-all" style={{ width: `${pctA}%` }}>
            {pctA >= 12 && <span className="text-[10px] text-white font-semibold px-1">{pctA.toFixed(0)}%</span>}
          </div>
        )}
        {pctDraw > 0 && (
          <div className="bg-gray-600 flex items-center justify-center transition-all" style={{ width: `${pctDraw}%` }}>
            {pctDraw >= 12 && <span className="text-[10px] text-white font-semibold px-1">{pctDraw.toFixed(0)}%</span>}
          </div>
        )}
        {pctB > 0 && (
          <div className="bg-violet-600 flex items-center justify-center transition-all" style={{ width: `${pctB}%` }}>
            {pctB >= 12 && <span className="text-[10px] text-white font-semibold px-1">{pctB.toFixed(0)}%</span>}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 text-[11px]">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600 inline-block" />
          <span className="text-indigo-300">{labelA}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-gray-600 inline-block" />
          <span className="text-gray-400">{labelDraw}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-violet-600 inline-block" />
          <span className="text-violet-300">{labelB}</span>
        </span>
      </div>
    </div>
  )
}