import { useEffect, useState, useCallback } from 'react'

interface BannerItem {
  id: number
  category: string
  title: string
  subtitle: string
  period: string
  bg: string
}

const BANNERS: BannerItem[] = [
  {
    id: 1, category: '대회',
    title: '2026 상반기 주식왕 선발대회',
    subtitle: '최대 상금 100만원 — 지금 바로 참가하세요',
    period: '2026.01.01 ~ 2026.06.30',
    bg: 'from-indigo-900 via-indigo-800 to-violet-900',
  },
  {
    id: 2, category: '이벤트',
    title: '신규 가입 이벤트 — 초기자산 2배 증정',
    subtitle: '가입 후 첫 대회 참가 시 자동 적용',
    period: '2026.04.01 ~ 2026.05.31',
    bg: 'from-emerald-900 via-emerald-800 to-teal-900',
  },
  {
    id: 3, category: '공지',
    title: 'KIS 실시간 주식 거래 서비스 오픈',
    subtitle: '한국투자증권 API 연동, 실제 시세 기반 모의투자',
    period: '2026.03.01 ~ 2026.12.31',
    bg: 'from-blue-900 via-blue-800 to-cyan-900',
  },
  {
    id: 4, category: '대회',
    title: '그룹 대회 출시 — 팀전 참가 가능',
    subtitle: '최대 100명 팀 구성, 친구들과 함께 도전',
    period: '2026.05.01 ~ 2026.08.31',
    bg: 'from-rose-900 via-rose-800 to-pink-900',
  },
  {
    id: 5, category: 'AI',
    title: 'AI 포트폴리오 분석 베타 출시',
    subtitle: 'Claude AI 기반 실시간 종목 분석 및 투자 전략 제안',
    period: '2026.05.13 ~ 2026.12.31',
    bg: 'from-amber-900 via-amber-800 to-orange-900',
  },
]

const CATEGORY_COLOR: Record<string, string> = {
  '대회':   'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  '이벤트': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  '공지':   'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'AI':     'bg-amber-500/20 text-amber-300 border-amber-500/30',
}

function useItemsPerView() {
  const [n, setN] = useState(3)
  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 640)  setN(1)
      else if (window.innerWidth < 1024) setN(2)
      else setN(3)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return n
}

export function HeroBanner() {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused]   = useState(false)
  const itemsPerView = useItemsPerView()
  const maxIndex = Math.max(0, BANNERS.length - itemsPerView)

  useEffect(() => {
    setCurrent((i) => Math.min(i, maxIndex))
  }, [maxIndex])

  const prev = useCallback(() => setCurrent((i) => (i <= 0 ? maxIndex : i - 1)), [maxIndex])
  const next = useCallback(() => setCurrent((i) => (i >= maxIndex ? 0 : i + 1)), [maxIndex])

  useEffect(() => {
    if (paused) return
    const id = setInterval(next, 5000)
    return () => clearInterval(id)
  }, [paused, next])

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* 카드 트랙 */}
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${current * (100 / itemsPerView)}%)` }}
      >
        {BANNERS.map((b) => (
          <div
            key={b.id}
            className="flex-shrink-0 p-2"
            style={{ width: `${100 / itemsPerView}%` }}
          >
            <div className={`relative h-44 rounded-2xl bg-gradient-to-br ${b.bg} overflow-hidden border border-white/5 cursor-pointer group`}>
              {/* 배경 패턴 */}
              <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

              {/* 콘텐츠 */}
              <div className="relative h-full flex flex-col justify-between p-5">
                <div>
                  <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${CATEGORY_COLOR[b.category] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/30'} mb-3`}>
                    {b.category}
                  </span>
                  <h3 className="text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-white/90 transition-colors">
                    {b.title}
                  </h3>
                  <p className="text-[11px] text-white/60 mt-1.5 line-clamp-1">{b.subtitle}</p>
                </div>
                <p className="text-[10px] text-white/40 font-mono">{b.period}</p>
              </div>

              {/* 호버 오버레이 */}
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors rounded-2xl" />
            </div>
          </div>
        ))}
      </div>

      {/* 좌우 화살표 */}
      {maxIndex > 0 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-900/80 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 transition-all flex items-center justify-center text-sm z-10"
          >‹</button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-900/80 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 transition-all flex items-center justify-center text-sm z-10"
          >›</button>
        </>
      )}

      {/* 점 인디케이터 */}
      {maxIndex > 0 && (
        <div className="flex justify-center gap-1.5 pb-1 pt-0.5">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all ${
                i === current
                  ? 'w-4 h-1.5 bg-indigo-400'
                  : 'w-1.5 h-1.5 bg-gray-700 hover:bg-gray-500'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}