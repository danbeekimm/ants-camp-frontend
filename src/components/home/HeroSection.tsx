import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import type { Competition } from '@/types/auth'

// ── 유틸 ─────────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('ko-KR')

function getDDay(comp: Competition): { label: string; value: string; color: string } {
  const now = Date.now()
  if (comp.status === 'ONGOING') {
    const days = Math.ceil((new Date(comp.competitionEndAt).getTime() - now) / 86400000)
    return { label: '종료까지', value: days <= 0 ? 'D-DAY' : `D-${days}`, color: '#ef4444' }
  }
  const days = Math.ceil((new Date(comp.competitionStartAt).getTime() - now) / 86400000)
  return { label: '시작까지', value: days <= 0 ? 'D-DAY' : `D-${days}`, color: '#a78bfa' }
}

// ── SVG 배경 차트 ─────────────────────────────────────────────────────────────
function ChartBg() {
  const line = 'M 0,128 L 40,122 L 80,126 L 120,112 L 160,98 L 200,104 L 240,88 L 280,94 L 320,75 L 360,68 L 400,74 L 440,57 L 480,46 L 520,38 L 560,28 L 600,18'
  const fill = `${line} L 600,140 L 0,140 Z`
  const endX = 600, endY = 18
  return (
    <svg viewBox="0 0 600 140" preserveAspectRatio="none"
      style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '170px', opacity: 0.6, filter: 'drop-shadow(0 0 8px rgba(52,211,153,0.5))' }}>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#34d399" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#cg)" />
      <path d={line} fill="none" stroke="#34d399" strokeWidth="2.5"
        strokeLinejoin="round" strokeLinecap="round"
        strokeDasharray="900" strokeDashoffset="900"
        style={{ animation: 'chart-draw 2s ease forwards' }} />
      <circle cx={endX} cy={endY} r="4" fill="#34d399" opacity="0.9" />
      <circle cx={endX} cy={endY} r="4" fill="none" stroke="#34d399" strokeWidth="2"
        style={{ animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite', transformOrigin: `${endX}px ${endY}px` }} />
    </svg>
  )
}

// ── 메인 히어로 카드 (LIVE TRADING — 확대 버전) ───────────────────────────────
function HeroCard({ comp }: { comp: Competition | null }) {
  const dday = comp ? getDDay(comp) : null
  return (
    <div className="relative overflow-hidden rounded-2xl h-full"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', minHeight: '380px' }}>
      <ChartBg />
      <div className="relative z-10 flex flex-col h-full p-7 md:p-9">
        <div className="mb-4 w-fit">
          <span className="flex items-center gap-1.5 text-[14px] font-bold tracking-widest px-3.5 py-1.5 rounded-full"
            style={comp
              ? { background: 'rgba(239,68,68,0.13)', color: '#f87171' }
              : { background: 'rgba(52,211,153,0.13)', color: '#34d399' }}>
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${comp ? 'bg-red-400' : 'bg-emerald-400'}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${comp ? 'bg-red-500' : 'bg-emerald-400'}`} />
            </span>
            LIVE TRADING
          </span>
        </div>

        {comp === null ? (
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-white font-bold mb-3" style={{ fontSize: '34px', lineHeight: 1.15 }}>진행 중인 대회가 없습니다</h2>
            <p className="mb-6" style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)' }}>새로운 대회가 곧 시작될 예정입니다</p>
            <Link to="/competitions" className="w-fit transition-opacity hover:opacity-90 flex items-center gap-1.5"
              style={{ background: '#ffffff', color: '#0f172a', padding: '12px 26px', borderRadius: '12px', fontSize: '15px', fontWeight: 600 }}>
              지난 대회 보기
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-white font-bold leading-tight mb-2" style={{ fontSize: '34px' }}>{comp.name}</h2>
            <p className="mb-6 line-clamp-2" style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', maxWidth: '480px' }}>{comp.description}</p>
            <div className="flex items-center gap-7 mb-6 flex-wrap">
              <div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '4px', letterSpacing: '0.05em' }}>운용 자산</p>
                <p style={{ fontSize: '26px', fontWeight: 700, color: '#fbbf24' }}>₩{fmt(comp.firstSeed)}</p>
              </div>
              <div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '4px', letterSpacing: '0.05em' }}>참가자</p>
                <p style={{ fontSize: '26px', fontWeight: 700, color: '#fff' }}>{comp.currentRegisters}명</p>
              </div>
              {dday && (
                <div>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '4px', letterSpacing: '0.05em' }}>{dday.label}</p>
                  <p style={{ fontSize: '26px', fontWeight: 700, color: dday.color }}>{dday.value}</p>
                </div>
              )}
            </div>
            <Link to={`/competitions/${comp.competitionId}`} className="w-fit transition-opacity hover:opacity-90 flex items-center gap-1.5 mt-auto"
              style={{ background: '#ffffff', color: '#0f172a', padding: '12px 26px', borderRadius: '12px', fontSize: '15px', fontWeight: 600 }}>
              {comp.status === 'ONGOING' ? '참가하기' : '대회 보기'}
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

// ── 메인 export ───────────────────────────────────────────────────────────────
interface Props {
  competitions: Competition[]
}

export function HeroSection({ competitions }: Props) {
  const [idx,     setIdx]     = useState(0)
  const [paused,  setPaused]  = useState(false)
  const [animKey, setAnimKey] = useState(0)

  const slides = [
    ...competitions.filter((c) => c.status === 'ONGOING'),
    ...competitions.filter((c) => c.status === 'PREPARING'),
  ]
  const total   = slides.length
  const current = total > 0 ? slides[idx % total] : null

  const go   = useCallback((newIdx: number) => { setIdx(newIdx); setAnimKey((k) => k + 1) }, [])
  const next = useCallback(() => go((idx + 1) % Math.max(total, 1)), [go, idx, total])
  const prev = useCallback(() => go((idx - 1 + Math.max(total, 1)) % Math.max(total, 1)), [go, idx, total])

  useEffect(() => {
    if (paused || total <= 1) return
    const id = setInterval(next, 6000)
    return () => clearInterval(id)
  }, [paused, next, total])

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div key={animKey} style={{ animation: 'hero-fade 0.4s ease' }}>
        <HeroCard comp={current} />
      </div>
      {total > 1 && (
        <div className="absolute bottom-5 right-5 flex items-center gap-2 z-20">
          <div className="flex gap-1 mr-1">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                className={`rounded-full transition-all ${i === idx ? 'w-4 h-1.5 bg-emerald-400' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/50'}`}
              />
            ))}
          </div>
          <button onClick={prev}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <svg width="11" height="11" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={next}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <svg width="11" height="11" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      )}
    </div>
  )
}
