import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, Flame, Zap, Wind, Shield } from 'lucide-react'

// ── 상수 ────────────────────────────────────────────────────────────────────
const METRICS = ['위험감수', '수익추구', '단기성', '집중도', '결단력']
const LS_KEY  = 'quiz:investment_type'

// ── 타입 정의 ────────────────────────────────────────────────────────────────
interface InvestType {
  key:        string
  icon:       string
  color:      string   // hex (chart, bar, badge)
  badgeBg:    string   // rgba
  badgeText:  string
  percentile: number
  scores:     number[] // [위험감수, 수익추구, 단기성, 집중도, 결단력] 0~100
  desc:       string
  tip:        string
}

const TYPES: InvestType[] = [
  {
    key:        '공격형',
    icon:       '🏹',
    color:      '#ef4444',
    badgeBg:    'rgba(239,68,68,0.15)',
    badgeText:  '#f87171',
    percentile: 15,
    scores:     [92, 88, 85, 78, 80],
    desc:       '변동성을 두려워하지 않고 집중 투자로 높은 수익을 추구합니다. 빠른 판단과 강한 멘탈이 강점입니다.',
    tip:        '대회 초반 공격적 매매로 상위권 진입 가능성이 높습니다.',
  },
  {
    key:        '성장형',
    icon:       '📈',
    color:      '#f59e0b',
    badgeBg:    'rgba(245,158,11,0.15)',
    badgeText:  '#fbbf24',
    percentile: 35,
    scores:     [65, 75, 50, 60, 70],
    desc:       '적정한 리스크를 감수하며 중기 성장을 추구합니다. 분산과 집중의 균형을 잘 유지합니다.',
    tip:        '중반부부터 꾸준히 순위가 올라가는 스타일입니다.',
  },
  {
    key:        '안정형',
    icon:       '🛡️',
    color:      '#10b981',
    badgeBg:    'rgba(16,185,129,0.15)',
    badgeText:  '#34d399',
    percentile: 25,
    scores:     [25, 40, 20, 35, 55],
    desc:       '손실 최소화를 우선시하며 안정적인 수익을 추구합니다. 원칙적이고 감정에 흔들리지 않습니다.',
    tip:        '꾸준하고 방어적인 운용으로 후반부까지 살아남을 수 있습니다.',
  },
  {
    key:        '분석형',
    icon:       '🔍',
    color:      '#6366f1',
    badgeBg:    'rgba(99,102,241,0.15)',
    badgeText:  '#818cf8',
    percentile: 20,
    scores:     [50, 65, 45, 70, 90],
    desc:       '재무 데이터와 기업 분석을 바탕으로 체계적으로 투자 결정을 내립니다. 논리와 근거가 행동의 기반입니다.',
    tip:        '정보 우위로 꾸준한 성과를 낼 수 있으며 후반부 강세를 보입니다.',
  },
]

// ── 옵션 비주얼 (강도 그라데이션: 공격적 → 방어적) ──────────────────────────
// 절대 색상은 라이트/다크에서 가독성이 다르므로 dark: variant 로 분리
const OPTION_VISUALS = [
  { Icon: Flame,  bg: 'bg-rose-500/[0.08]',    border: 'border-rose-500/30',    iconWrap: 'bg-rose-500/15',    iconColor: 'text-rose-600 dark:text-rose-300',    hover: 'hover:border-rose-500 hover:bg-rose-500/[0.15] hover:text-rose-700 dark:hover:text-rose-100' },
  { Icon: Zap,    bg: 'bg-amber-500/[0.08]',   border: 'border-amber-500/30',   iconWrap: 'bg-amber-500/15',   iconColor: 'text-amber-600 dark:text-amber-300',   hover: 'hover:border-amber-500 hover:bg-amber-500/[0.15] hover:text-amber-700 dark:hover:text-amber-100' },
  { Icon: Wind,   bg: 'bg-sky-500/[0.08]',     border: 'border-sky-500/30',     iconWrap: 'bg-sky-500/15',     iconColor: 'text-sky-600 dark:text-sky-300',       hover: 'hover:border-sky-500 hover:bg-sky-500/[0.15] hover:text-sky-700 dark:hover:text-sky-100' },
  { Icon: Shield, bg: 'bg-emerald-500/[0.08]', border: 'border-emerald-500/30', iconWrap: 'bg-emerald-500/15', iconColor: 'text-emerald-600 dark:text-emerald-300', hover: 'hover:border-emerald-500 hover:bg-emerald-500/[0.15] hover:text-emerald-700 dark:hover:text-emerald-100' },
]

// ── 질문 ─────────────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    q: '보유 종목이 -20% 하락했을 때 나의 반응은?',
    options: [
      { label: '추가 매수 기회다',          score: 1 },
      { label: '일단 기다려보자',           score: 2 },
      { label: '일부 손절한다',             score: 3 },
      { label: '전량 매도해 손실을 막는다', score: 4 },
    ],
  },
  {
    q: '한 종목에 투자금 중 얼마까지 집중할 수 있나요?',
    options: [
      { label: '50% 이상도 괜찮다',        score: 1 },
      { label: '30~50% 정도',             score: 2 },
      { label: '10~30% 정도',             score: 3 },
      { label: '절대 10% 이하로 분산한다', score: 4 },
    ],
  },
  {
    q: '주로 생각하는 투자 기간은?',
    options: [
      { label: '며칠~한 달 (단기 트레이딩)', score: 1 },
      { label: '3~6개월',                   score: 2 },
      { label: '6개월~1년',                 score: 3 },
      { label: '1년 이상 장기 투자',         score: 4 },
    ],
  },
  {
    q: '투자에서 손실이 났을 때 드는 감정은?',
    options: [
      { label: '오히려 흥미롭다, 기회다',    score: 1 },
      { label: '불안하지만 버틸 수 있다',    score: 2 },
      { label: '많이 걱정되고 신경 쓰인다',  score: 3 },
      { label: '밤에 잠이 오지 않는다',      score: 4 },
    ],
  },
  {
    q: '투자 결정 시 가장 중요하게 보는 것은?',
    options: [
      { label: '직감과 시장 분위기',        score: 1 },
      { label: '커뮤니티·지인 추천',        score: 2 },
      { label: '뉴스·차트·보조지표',        score: 3 },
      { label: '재무제표·기업 실적 분석',   score: 4 },
    ],
  },
]

// ── 유형 결정 ─────────────────────────────────────────────────────────────────
function getType(total: number): InvestType {
  if (total <= 8)  return TYPES[0]
  if (total <= 12) return TYPES[1]
  if (total <= 16) return TYPES[2]
  return TYPES[3]
}

function loadSaved(): InvestType | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const { total } = JSON.parse(raw)
    return getType(Number(total))
  } catch { return null }
}

// ── 레이더 차트 SVG ──────────────────────────────────────────────────────────
function RadarChart({ scores, color }: { scores: number[]; color: string }) {
  const cx = 90, cy = 90, maxR = 70
  const n = 5
  const angles = Array.from({ length: n }, (_, i) => (i * 2 * Math.PI) / n - Math.PI / 2)

  const pt = (r: number, i: number) => ({
    x: cx + r * Math.cos(angles[i]),
    y: cy + r * Math.sin(angles[i]),
  })

  const gridLevels = [0.25, 0.5, 0.75, 1.0]
  const gridColor  = 'rgba(255,255,255,0.06)'
  const axisColor  = 'rgba(255,255,255,0.08)'

  const dataPoints = scores.map((s, i) => pt((s / 100) * maxR, i))
  const dataPath   = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'

  return (
    <svg width="180" height="180" viewBox="0 0 180 180" className="flex-shrink-0">
      {/* 배경 그리드 */}
      {gridLevels.map((lvl) => {
        const pts = angles.map((_, i) => pt(maxR * lvl, i))
        const d   = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'
        return <path key={lvl} d={d} fill="none" stroke={gridColor} strokeWidth="1" />
      })}

      {/* 축 라인 */}
      {angles.map((_, i) => {
        const end = pt(maxR, i)
        return <line key={i} x1={cx} y1={cy} x2={end.x.toFixed(1)} y2={end.y.toFixed(1)}
          stroke={axisColor} strokeWidth="1" />
      })}

      {/* 데이터 영역 */}
      <path d={dataPath} fill={color} fillOpacity="0.15" stroke={color} strokeWidth="2"
        strokeLinejoin="round" />

      {/* 데이터 포인트 */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="3.5"
          fill={color} stroke="rgba(0,0,0,0.4)" strokeWidth="1" />
      ))}

      {/* 축 라벨 */}
      {METRICS.map((label, i) => {
        const lp = pt(maxR + 16, i)
        return (
          <text key={i} x={lp.x.toFixed(1)} y={lp.y.toFixed(1)}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="9" fill="rgba(255,255,255,0.45)" fontFamily="sans-serif">
            {label}
          </text>
        )
      })}
    </svg>
  )
}

// ── 점수 막대 ─────────────────────────────────────────────────────────────────
function ScoreBars({ scores, color }: { scores: number[]; color: string }) {
  return (
    <div className="flex-1 flex flex-col justify-center gap-2.5">
      {METRICS.map((label, i) => (
        <div key={label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-400">{label}</span>
            <span className="text-[10px] font-mono font-bold text-gray-200">{scores[i]}</span>
          </div>
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${scores[i]}%`, background: color }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
type Phase = 'idle' | 'quiz' | 'result'

export function InvestmentQuiz() {
  const saved = loadSaved()
  const [phase,    setPhase]    = useState<Phase>(saved ? 'result' : 'idle')
  const [currentQ, setCurrentQ] = useState(0)
  const [scores,   setScores]   = useState<number[]>([])
  const [result,   setResult]   = useState<InvestType | null>(saved)
  const [animating, setAnimating] = useState(false)

  const start = () => { setPhase('quiz'); setCurrentQ(0); setScores([]) }

  const handleAnswer = (score: number) => {
    if (animating) return
    setAnimating(true)
    setTimeout(() => {
      const next = [...scores, score]
      if (currentQ === QUESTIONS.length - 1) {
        const total = next.reduce((a, b) => a + b, 0)
        const type  = getType(total)
        localStorage.setItem(LS_KEY, JSON.stringify({ total }))
        setResult(type)
        setPhase('result')
      } else {
        setScores(next)
        setCurrentQ((q) => q + 1)
      }
      setAnimating(false)
    }, 180)
  }

  const reset = () => {
    localStorage.removeItem(LS_KEY)
    setResult(null); setScores([]); setCurrentQ(0); setPhase('idle')
  }

  // ── 대기 화면 ───────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 min-h-[360px] flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-sm font-bold text-gray-100">투자 성향 테스트</h2>
          <span className="text-[9px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded-full">5문항</span>
        </div>
        <p className="text-xs text-gray-500 mb-3">나의 투자 스타일을 레이더 차트로 확인하세요</p>

        <div className="flex-1 flex flex-col gap-2 mb-3">
          {TYPES.map(({ icon, key, color, badgeBg, badgeText, desc }) => (
            <div key={key} className="flex-1 min-h-0 rounded-xl px-3 py-2 border flex items-center gap-2.5 transition-colors"
              style={{ background: badgeBg, borderColor: `${color}30` }}>
              <span className="text-xl flex-shrink-0">{icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-tight" style={{ color: badgeText }}>{key}</p>
                <p className="text-[10px] text-gray-500 leading-snug mt-0.5 line-clamp-2">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={start}
          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors">
          테스트 시작하기 →
        </button>
      </div>
    )
  }

  // ── 퀴즈 화면 ───────────────────────────────────────────────────────────────
  if (phase === 'quiz') {
    const q = QUESTIONS[currentQ]
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 min-h-[360px] flex flex-col">
        {/* 진행 바 */}
        <div className="flex items-center gap-1.5 mb-4">
          <div className="flex gap-1 flex-1">
            {QUESTIONS.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                i < currentQ ? 'bg-indigo-500' : i === currentQ ? 'bg-indigo-400' : 'bg-gray-700'
              }`} />
            ))}
          </div>
          <span className="text-[10px] text-gray-500">{currentQ + 1}/{QUESTIONS.length}</span>
        </div>

        <p className="text-sm font-semibold text-gray-100 mb-4 leading-relaxed min-h-[40px]">{q.q}</p>

        <div className="flex-1 flex flex-col gap-2">
          {q.options.map(({ label, score }, i) => {
            const { Icon, bg, border, iconWrap, iconColor, hover } = OPTION_VISUALS[i]
            return (
              <button key={i} onClick={() => handleAnswer(score)} disabled={animating}
                className={`flex-1 min-h-0 text-left text-xs px-3 py-2 rounded-xl ${bg} border ${border} text-gray-200 ${hover} transition-all disabled:opacity-50 flex items-center gap-2.5`}>
                <span className={`flex-shrink-0 w-7 h-7 rounded-lg ${iconWrap} flex items-center justify-center`}>
                  <Icon className={`w-3.5 h-3.5 ${iconColor}`} strokeWidth={2.25} />
                </span>
                <span className="leading-snug">{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── 결과 화면 (레이더 차트) ─────────────────────────────────────────────────
  if (!result) return null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 min-h-[360px] flex flex-col">
      {/* 헤더 */}
      <div className="mb-4">
        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1">
          YOUR INVESTOR PROFILE
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{result.icon}</span>
            <h2 className="text-xl font-semibold text-gray-100">{result.key}</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: result.badgeBg, color: result.badgeText }}>
              상위 {result.percentile}%
            </span>
          </div>
          <button onClick={reset}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 차트 + 점수 막대 */}
      <div className="flex items-center gap-3 mb-4">
        <RadarChart scores={result.scores} color={result.color} />
        <ScoreBars  scores={result.scores} color={result.color} />
      </div>

      {/* 설명 */}
      <div className="bg-gray-800/50 rounded-xl px-3.5 py-3 mb-4">
        <p className="text-xs text-gray-300 leading-relaxed">{result.desc}</p>
        <p className="text-[11px] text-gray-500 mt-1.5">💡 {result.tip}</p>
      </div>

      <div className="flex-1" />

      {/* CTA */}
      <Link to="/competitions"
        className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors">
        대회 참가하기
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  )
}