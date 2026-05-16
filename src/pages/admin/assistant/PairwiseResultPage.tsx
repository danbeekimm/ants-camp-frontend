import { useEffect, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { getPairwiseSummary, type PairwiseSummaryResponse } from '@/services/assistantApi'
import { usePollingStatus } from '@/hooks/usePollingStatus'
import { LoadingDots } from '@/components/ui/Spinner'
import { WinBar } from '@/components/ui/WinBar'
import { Alert } from '@/components/ui/Alert'
import { savePairwiseHistory } from '@/utils/pairwiseHistory'
import { AdminBackHeader, AdminButton, AdminCard } from '@/components/admin'

export function PairwiseResultPage() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()

  const evalRunIdA = searchParams.get('evalRunIdA') ?? ''
  const evalRunIdB = searchParams.get('evalRunIdB') ?? ''

  const canFetch = Boolean(evalRunIdA && evalRunIdB)

  const { value: summary, error: fetchError } = usePollingStatus<PairwiseSummaryResponse | null>(
    () => canFetch ? getPairwiseSummary(evalRunIdA, evalRunIdB) : Promise.resolve(null),
    (v) => v != null && (v.status === 'COMPLETED' || v.status === 'FAILED'),
  )

  const savedRef = useRef(false)
  useEffect(() => {
    if (summary?.status !== 'COMPLETED' || savedRef.current) return
    savedRef.current = true
    savePairwiseHistory({
      runIdA: evalRunIdA, runIdB: evalRunIdB,
      ragModelA: summary.ragModelA, ragModelB: summary.ragModelB,
      memoA: null, memoB: null,
      savedAt: new Date().toISOString(),
    })
  }, [summary?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const isFailed    = summary?.status === 'FAILED'
  const isComputing = canFetch && !isFailed && !fetchError && summary?.status !== 'COMPLETED'
  const error = isFailed
    ? '공통 질문이 없거나 처리 중 오류가 발생했습니다.'
    : fetchError

  if (!canFetch) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-[13px] text-slate-500 dark:text-slate-400">비교할 Run ID가 없습니다.</p>
        <AdminButton
          variant="primary"
          icon={<Plus className="w-3.5 h-3.5" strokeWidth={2.5} />}
          onClick={() => navigate('/admin/assistant/evaluations/pairwise/new')}
        >
          새 Pairwise 실행
        </AdminButton>
      </div>
    )
  }

  return (
    <div>
      <AdminBackHeader
        back="/admin/assistant/evaluations/pairwise/new"
        kicker="Assistant · Pairwise"
        title="Pairwise 결과"
        subtitle={summary?.status === 'COMPLETED' && (
          <span>
            <span className="font-mono">{summary.ragModelA}</span>
            <span className="text-slate-400 mx-1.5">vs</span>
            <span className="font-mono">{summary.ragModelB}</span>
          </span>
        )}
      />

      {error && <Alert className="mb-5">{error}</Alert>}

      {/* 계산 중 */}
      {isComputing && (
        <div className="flex flex-col items-center gap-4 py-16 text-slate-500 dark:text-slate-400">
          <LoadingDots />
          {summary?.status === 'RUNNING' && summary.totalCount > 0 ? (
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              <p className="text-[13.5px]">
                <span className="text-violet-700 dark:text-violet-300 font-semibold">{summary.doneCount}</span>
                <span className="text-slate-500 dark:text-slate-400"> / {summary.totalCount} 평가 중...</span>
              </p>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-600 transition-all duration-500"
                  style={{ width: `${Math.round((summary.doneCount / summary.totalCount) * 100)}%` }}
                />
              </div>
            </div>
          ) : summary?.status === 'PENDING' ? (
            <p className="text-[13.5px]">처리 대기 중...</p>
          ) : (
            <p className="text-[13.5px]">비교 결과를 계산하고 있습니다...</p>
          )}
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center max-w-xs leading-relaxed">
            페이지를 이탈해도 백그라운드에서 계속 처리됩니다. 돌아와 새로고침하면 결과를 확인할 수 있습니다.
          </p>
        </div>
      )}

      {/* 결과 */}
      {summary && summary.status === 'COMPLETED' && summary.byJudge.length > 0 && (
        <div className="flex flex-col gap-6">
          {/* Run 헤더 칩 */}
          <div className="flex items-center gap-4">
            <RunChip
              label="A"
              model={summary.ragModelA}
              runId={evalRunIdA}
              tone="indigo"
            />
            <span className="text-slate-400 dark:text-slate-500 text-[13px] font-semibold uppercase tracking-wider">vs</span>
            <RunChip
              label="B"
              model={summary.ragModelB}
              runId={evalRunIdB}
              tone="violet"
            />
          </div>

          {/* 전체 합계 */}
          <AdminCard label="전체 합산" right={
            summary.totalWinA !== summary.totalWinB && (
              <span className={
                summary.totalWinA > summary.totalWinB
                  ? 'inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-500/30'
                  : 'inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200 border border-violet-200 dark:border-violet-500/30'
              }>
                {summary.totalWinA > summary.totalWinB ? summary.ragModelA : summary.ragModelB} 우세
              </span>
            )
          }>
            <WinBar
              winA={summary.totalWinA}
              draw={summary.totalDraw}
              winB={summary.totalWinB}
              labelA={`${summary.ragModelA}  ${summary.totalWinA}승`}
              labelDraw={`무 ${summary.totalDraw}`}
              labelB={`${summary.ragModelB}  ${summary.totalWinB}승`}
            />
          </AdminCard>

          {/* Judge별 행 */}
          <div className="flex flex-col gap-3">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Judge 별 결과</p>
            {summary.byJudge.map((judge) => (
              <div
                key={judge.judgeModel}
                className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 flex flex-col gap-3"
              >
                <p className="text-[12px] font-mono text-slate-500 dark:text-slate-400">{judge.judgeModel}</p>
                <WinBar
                  winA={judge.winA}
                  draw={judge.draw}
                  winB={judge.winB}
                  labelA={`${summary.ragModelA}  ${judge.winA}승`}
                  labelDraw={`무 ${judge.draw}`}
                  labelB={`${summary.ragModelB}  ${judge.winB}승`}
                />
              </div>
            ))}
          </div>

          {/* 각 Run 링크 */}
          <div className="flex gap-3 text-[12.5px]">
            <Link
              to={`/admin/assistant/evaluations/${evalRunIdA}`}
              className="text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-200 transition-colors font-medium"
            >
              Run A 상세 →
            </Link>
            <Link
              to={`/admin/assistant/evaluations/${evalRunIdB}`}
              className="text-violet-700 dark:text-violet-300 hover:text-violet-900 dark:hover:text-violet-200 transition-colors font-medium"
            >
              Run B 상세 →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function RunChip({
  label,
  model,
  runId,
  tone,
}: {
  label: string
  model: string
  runId: string
  tone: 'indigo' | 'violet'
}) {
  const colorClass = tone === 'indigo'
    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/40 dark:text-indigo-200'
    : 'bg-violet-50 border-violet-300 text-violet-700 dark:bg-violet-500/10 dark:border-violet-500/40 dark:text-violet-200'
  return (
    <div className={`border-2 rounded-2xl px-5 py-3 flex flex-col gap-0.5 ${colorClass}`}>
      <p className="text-[10.5px] font-bold tracking-wider">RUN {label}</p>
      <p className="text-[14px] font-semibold font-mono">{model}</p>
      <p className="text-[10.5px] opacity-70 font-mono truncate max-w-[180px]">{runId.slice(0, 8)}…</p>
    </div>
  )
}
