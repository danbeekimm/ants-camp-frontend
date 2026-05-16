import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Play } from 'lucide-react'
import {
  listEvalResults,
  runPairwise,
  type EvalResultItem,
} from '@/services/assistantApi'
import { LoadingDots } from '@/components/ui/Spinner'
import { RagModelChip } from '@/components/ui/RagModelChip'
import { formatDate } from '@/utils/formatDate'
import { Alert } from '@/components/ui/Alert'
import { AdminBackHeader } from '@/components/admin'

interface RunSummary {
  runId: string
  judgeModels: string[]
  ragModel: string
  memo: string | null
  runAt: string
}

function toRunSummaries(items: EvalResultItem[]): RunSummary[] {
  const map = new Map<string, RunSummary>()
  for (const item of items) {
    if (!map.has(item.runId)) {
      map.set(item.runId, {
        runId:       item.runId,
        judgeModels: item.judgeModels,
        ragModel:    item.ragModel,
        memo:        item.memo,
        runAt:       item.runAt,
      })
    }
  }
  return Array.from(map.values())
}

export function PairwiseNewPage() {
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()

  const [availableRuns, setAvailableRuns] = useState<RunSummary[]>([])
  const [runsLoading,   setRunsLoading]   = useState(true)

  const [runA, setRunA] = useState<RunSummary | null>(null)
  const [runB, setRunB] = useState<RunSummary | null>(null)
  const [selectedJudges, setSelectedJudges] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    listEvalResults()
      .then((res) => {
        const runs = toRunSummaries(res.content)
        setAvailableRuns(runs)

        const aId = searchParams.get('a') || sessionStorage.getItem('pairwiseRunA') || ''
        const bId = searchParams.get('b') || ''
        sessionStorage.removeItem('pairwiseRunA')

        const a = runs.find((r) => r.runId === aId)
        const b = runs.find((r) => r.runId === bId)
        if (a) setRunA(a)
        if (b) setRunB(b)
      })
      .catch(() => {})
      .finally(() => setRunsLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const commonJudges = useMemo(() => {
    if (!runA || !runB) return []
    return runA.judgeModels.filter((m) => runB.judgeModels.includes(m))
  }, [runA?.runId, runB?.runId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSelectedJudges(commonJudges)
  }, [commonJudges.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleJudge = (model: string) =>
    setSelectedJudges((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model],
    )

  const [commonQuestionCount, setCommonQuestionCount] = useState<number | null>(null)
  const [loadingCommon, setLoadingCommon] = useState(false)

  useEffect(() => {
    setCommonQuestionCount(null)
    if (!runA || !runB) return
    setLoadingCommon(true)
    Promise.all([
      listEvalResults({ runId: runA.runId }),
      listEvalResults({ runId: runB.runId }),
    ]).then(([resA, resB]) => {
      const qA = new Set(resA.content.map((i) => i.question))
      const qB = new Set(resB.content.map((i) => i.question))
      setCommonQuestionCount([...qA].filter((q) => qB.has(q)).length)
    }).catch(() => {})
    .finally(() => setLoadingCommon(false))
  }, [runA?.runId, runB?.runId]) // eslint-disable-line react-hooks/exhaustive-deps

  const sameModel = !!(runA && runB && runA.ragModel === runB.ragModel)
  const noCommon  = !loadingCommon && commonQuestionCount === 0

  const handleRun = async () => {
    if (!runA || !runB) { alert('두 평가 Run을 모두 선택해주세요.'); return }
    if (selectedJudges.length === 0) { alert('Judge 모델을 1개 이상 선택해주세요.'); return }

    setSubmitting(true)
    try {
      await runPairwise({ evalRunIdA: runA.runId, evalRunIdB: runB.runId, judgeModels: selectedJudges })
      navigate(`/admin/assistant/evaluations/pairwise?evalRunIdA=${runA.runId}&evalRunIdB=${runB.runId}`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Pairwise 실행에 실패했습니다.')
      setSubmitting(false)
    }
  }

  return (
    <div>
      <AdminBackHeader
        back="/admin/assistant/evaluations/pairwise"
        kicker="Assistant · Pairwise"
        title="Pairwise 비교 실행"
        subtitle="두 개의 평가 Run 을 선택해 모델·프롬프트 변화에 따른 답변 품질 차이를 직접 비교합니다."
      />

      <div className="flex flex-col gap-6">
        {/* Run A / B 선택 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RunSlot
            label="Run A"
            accentClass="bg-indigo-50 border-indigo-300 dark:bg-indigo-500/10 dark:border-indigo-500/40"
            value={runA}
            onChange={setRunA}
            runs={availableRuns}
            loading={runsLoading}
            excludeId={runB?.runId}
          />
          <RunSlot
            label="Run B"
            accentClass="bg-violet-50 border-violet-300 dark:bg-violet-500/10 dark:border-violet-500/40"
            value={runB}
            onChange={setRunB}
            runs={availableRuns}
            loading={runsLoading}
            excludeId={runA?.runId}
          />
        </div>

        {/* Judge 선택 */}
        {runA && runB && (
          <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 mb-3">Judge 모델 선택</p>
            {commonJudges.length === 0 ? (
              <p className="text-[13px] text-rose-600 dark:text-rose-400">두 Run의 공통 Judge 모델이 없습니다.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {commonJudges.map((model) => (
                  <label key={model} className="flex items-center gap-2 cursor-pointer text-[13px] text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={selectedJudges.includes(model)}
                      onChange={() => toggleJudge(model)}
                      className="w-4 h-4 accent-indigo-500"
                    />
                    <span className="font-mono">{model}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 검증 결과 */}
        {runA && runB && (
          <div className="flex flex-col gap-2">
            {sameModel && (
              <Alert variant="error">
                두 Run의 RAG 모델이 동일합니다 ({runA.ragModel}). 서로 다른 모델을 선택해야 의미 있는 비교가 가능합니다.
              </Alert>
            )}
            {!sameModel && noCommon && (
              <Alert variant="error">
                공통 질문이 없습니다. 동일한 질문 셋으로 평가된 Run을 선택해야 비교가 가능합니다.
              </Alert>
            )}
            {!sameModel && !loadingCommon && commonQuestionCount !== null && commonQuestionCount > 0 && (
              <Alert variant="success">
                공통 질문 {commonQuestionCount}개 확인됨 — 비교 가능합니다.
              </Alert>
            )}
            {loadingCommon && (
              <div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400 py-1">
                <LoadingDots /><span>공통 질문 확인 중...</span>
              </div>
            )}
          </div>
        )}

        {/* 실행 버튼 */}
        <div className="flex justify-end">
          <button
            onClick={handleRun}
            disabled={submitting || !runA || !runB || selectedJudges.length === 0 || sameModel || noCommon || loadingCommon}
            className="px-7 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-[13.5px] font-semibold disabled:opacity-40 transition-all flex items-center gap-2 shadow-sm"
          >
            {submitting ? (
              <><LoadingDots /><span>실행 중...</span></>
            ) : (
              <>
                <Play className="w-4 h-4" strokeWidth={2.5} />
                비교 실행
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Run 선택 슬롯 ──────────────────────────────────────────────────────────
interface RunSlotProps {
  label:       string
  accentClass: string
  value:       RunSummary | null
  onChange:    (run: RunSummary) => void
  runs:        RunSummary[]
  loading:     boolean
  excludeId?:  string
}

function RunSlot({ label, accentClass, value, onChange, runs, loading, excludeId }: RunSlotProps) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')

  const filtered = runs
    .filter((r) => r.runId !== excludeId)
    .filter(
      (r) =>
        search === '' ||
        r.runId.toLowerCase().includes(search.toLowerCase()) ||
        (r.memo ?? '').includes(search) ||
        r.ragModel.includes(search),
    )

  return (
    <div className={`border-2 rounded-2xl p-5 flex flex-col gap-3 ${value ? accentClass : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70'}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          {value ? '변경' : '선택'}
        </button>
      </div>

      {value ? (
        <RunCard run={value} />
      ) : (
        <p className="text-[13px] text-slate-500 dark:text-slate-400 py-4 text-center">평가 Run을 선택하세요</p>
      )}

      {open && (
        <div className="flex flex-col gap-2 border-t border-slate-200 dark:border-slate-800 pt-3 mt-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="runId / 모델 / 메모 검색..."
            className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-[12px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/10"
            autoFocus
          />
          {loading ? (
            <div className="flex justify-center py-4"><LoadingDots /></div>
          ) : filtered.length === 0 ? (
            <p className="text-[12px] text-slate-500 text-center py-3">항목 없음</p>
          ) : (
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {filtered.map((r) => (
                <button
                  key={r.runId}
                  onClick={() => { onChange(r); setOpen(false); setSearch('') }}
                  className={
                    value?.runId === r.runId
                      ? 'w-full text-left px-3 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30'
                      : 'w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors'
                  }
                >
                  <RunCard run={r} compact />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RunCard({ run, compact = false }: { run: RunSummary; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">{run.memo || formatDate(run.runAt)}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <RagModelChip model={run.ragModel} />
        {!compact && run.judgeModels.map((m) => (
          <span key={m} className="chip chip-indigo" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{m}</span>
        ))}
        {run.memo && (
          <span className="text-[10.5px] text-slate-500 dark:text-slate-400 italic truncate max-w-[140px]">{run.memo}</span>
        )}
      </div>
      {!compact && (
        <p className="text-[10.5px] text-slate-400 dark:text-slate-500 font-mono">{formatDate(run.runAt)}</p>
      )}
    </div>
  )
}
