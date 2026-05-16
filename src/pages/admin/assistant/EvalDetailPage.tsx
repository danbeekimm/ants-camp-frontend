import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getEvalRunStatus,
  listEvalResults,
  type EvalResultItem,
  type EvalRunStatus,
  type RetrievedChunk,
} from '@/services/assistantApi'
import { usePollingStatus } from '@/hooks/usePollingStatus'
import { LoadingDots } from '@/components/ui/Spinner'
import { RagModelChip } from '@/components/ui/RagModelChip'
import { formatDate } from '@/utils/formatDate'
import { Alert } from '@/components/ui/Alert'
import { AdminBackHeader, AdminButton, AdminCard } from '@/components/admin'

const STATUS_LABEL: Record<EvalRunStatus, string> = {
  PENDING:   '대기 중',
  RUNNING:   '실행 중',
  COMPLETED: '완료',
  FAILED:    '실패',
}

const STATUS_TONE: Record<EvalRunStatus, { dot: string; text: string; bg: string; border: string }> = {
  PENDING:   { dot: 'bg-slate-400',               text: 'text-slate-600 dark:text-slate-300',   bg: 'bg-slate-100 dark:bg-slate-800',           border: 'border-slate-200 dark:border-slate-700' },
  RUNNING:   { dot: 'bg-amber-500 animate-pulse', text: 'text-amber-700 dark:text-amber-300',   bg: 'bg-amber-50 dark:bg-amber-500/15',         border: 'border-amber-200 dark:border-amber-500/30' },
  COMPLETED: { dot: 'bg-emerald-500',             text: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-500/15',   border: 'border-emerald-200 dark:border-emerald-500/30' },
  FAILED:    { dot: 'bg-rose-500',                text: 'text-rose-700 dark:text-rose-300',     bg: 'bg-rose-50 dark:bg-rose-500/15',           border: 'border-rose-200 dark:border-rose-500/30' },
}

const SCORE_LABELS: Record<string, string> = {
  relevance:        '관련성',
  faithfulness:     '충실도',
  contextPrecision: '컨텍스트 정밀도',
}

const TERMINAL: EvalRunStatus[] = ['COMPLETED', 'FAILED']

export function EvalDetailPage() {
  const { evalRunId } = useParams<{ evalRunId: string }>()
  const navigate = useNavigate()

  const [results, setResults] = useState<EvalResultItem[]>([])
  const [resultsLoading, setResultsLoading] = useState(false)

  const { value: status } = usePollingStatus(
    () => getEvalRunStatus(evalRunId!),
    (s) => TERMINAL.includes(s),
  )

  useEffect(() => {
    if (status !== 'COMPLETED') return
    setResultsLoading(true)
    listEvalResults({ runId: evalRunId })
      .then((res) => setResults(res.content))
      .catch(() => {})
      .finally(() => setResultsLoading(false))
  }, [status, evalRunId])

  const runMeta = results[0] ?? null

  const grouped = useMemo(() => {
    const map = new Map<string, EvalResultItem[]>()
    for (const item of results) {
      if (!map.has(item.question)) map.set(item.question, [])
      map.get(item.question)!.push(item)
    }
    return Array.from(map.entries())
  }, [results])

  const handlePairwise = () => {
    if (!evalRunId) return
    sessionStorage.setItem('pairwiseRunA', evalRunId)
    navigate('/admin/assistant/evaluations/pairwise/new')
  }

  return (
    <div>
      <AdminBackHeader
        back="/admin/assistant/evaluations"
        kicker="Assistant · Evaluation"
        title={runMeta?.memo || (runMeta?.runAt ? formatDate(runMeta.runAt) : '평가 상세')}
        subtitle={evalRunId && (
          <span className="font-mono text-[11.5px] text-slate-400 dark:text-slate-500">{evalRunId}</span>
        )}
        action={status === 'COMPLETED' && (
          <AdminButton variant="secondary" size="sm" onClick={handlePairwise}>
            Pairwise 비교에 사용
          </AdminButton>
        )}
      />

      {/* 상태 + 메타 */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 mb-6 flex flex-wrap items-center gap-4">
        {status && (
          <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1 rounded-full border ${STATUS_TONE[status].bg} ${STATUS_TONE[status].text} ${STATUS_TONE[status].border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_TONE[status].dot}`} />
            {STATUS_LABEL[status]}
          </span>
        )}
        {runMeta && (
          <>
            {runMeta.ragModel && (
              <MetaPair label="RAG"><RagModelChip model={runMeta.ragModel} /></MetaPair>
            )}
            {runMeta.judgeModels.length > 0 && <MetaPair label="Judge">{runMeta.judgeModels.join(', ')}</MetaPair>}
            {runMeta.memo && <MetaPair label="메모">{runMeta.memo}</MetaPair>}
            {runMeta.runAt && <MetaPair label="실행 시각"><span className="font-mono">{formatDate(runMeta.runAt)}</span></MetaPair>}
          </>
        )}
      </div>

      {/* RUNNING / PENDING 안내 */}
      {status && !TERMINAL.includes(status) && (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-500 dark:text-slate-400">
          <LoadingDots />
          <p className="text-[13.5px]">{STATUS_LABEL[status]}... 결과가 준비되면 자동으로 표시됩니다.</p>
        </div>
      )}

      {/* FAILED 안내 */}
      {status === 'FAILED' && <Alert>평가 실행에 실패했습니다.</Alert>}

      {resultsLoading && <div className="flex justify-center py-10"><LoadingDots /></div>}

      {!resultsLoading && grouped.length > 0 && (
        <div className="flex flex-col gap-4">
          {grouped.map(([question, items], idx) => (
            <QuestionCard key={idx} question={question} items={items} index={idx} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── 질문 카드 ──────────────────────────────────────────────────────────────
function QuestionCard({
  question,
  items,
  index,
}: {
  question: string
  items: EvalResultItem[]
  index: number
}) {
  const answer = items[0]?.answer ?? ''
  const retrievedChunks = items[0]?.retrievedChunks ?? []
  const promptUsed = items[0]?.promptUsed ?? null
  const scoreMetrics = Object.keys(SCORE_LABELS) as Array<'relevance' | 'faithfulness' | 'contextPrecision'>

  return (
    <AdminCard>
      <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 mb-1.5">Q{index + 1}</p>
      <p className="text-[14px] font-medium text-slate-900 dark:text-slate-100 mb-4 leading-relaxed">{question}</p>

      {/* 점수 비교 테이블 */}
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="text-left text-slate-500 dark:text-slate-400 font-medium py-2 pr-4 w-32 uppercase tracking-wider text-[10.5px]">지표</th>
              {items.map((item) => (
                <th key={item.judgeModel} className="text-slate-500 dark:text-slate-400 font-mono font-normal py-2 px-3 text-center">
                  {item.judgeModel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scoreMetrics.map((metric) => (
              <tr key={metric} className="border-b border-slate-100 dark:border-slate-800/60">
                <td className="text-slate-700 dark:text-slate-200 py-2.5 pr-4">{SCORE_LABELS[metric]}</td>
                {items.map((item) => {
                  const val = item.score[metric]
                  return (
                    <td key={item.judgeModel} className="py-2.5 px-3 text-center">
                      {val != null ? <ScoreBadge score={val} /> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Judge별 피드백 */}
      {items.some((i) => i.score.feedback) && (
        <div className="flex flex-col gap-2 mb-4">
          {items.map((item) =>
            item.score.feedback ? (
              <div key={item.judgeModel} className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl px-4 py-3">
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono mb-1">{item.judgeModel} 피드백</p>
                <p className="text-[12.5px] text-slate-700 dark:text-slate-200 leading-relaxed">{item.score.feedback}</p>
              </div>
            ) : null,
          )}
        </div>
      )}

      <Collapsible label="생성된 답변">
        <p className="text-[12.5px] text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{answer}</p>
      </Collapsible>

      {retrievedChunks.length > 0 && (
        <Collapsible label={`참조 청크 (${retrievedChunks.length})`}>
          <div className="flex flex-col gap-2">
            {retrievedChunks.map((chunk) => (
              <ChunkCard key={chunk.documentChunkId} chunk={chunk} />
            ))}
          </div>
        </Collapsible>
      )}

      {promptUsed && (
        <Collapsible label="사용된 프롬프트">
          <pre className="text-[11.5px] text-slate-700 dark:text-slate-300 font-mono leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-950/60 rounded-xl px-4 py-3 overflow-x-auto border border-slate-200 dark:border-slate-800">
            {promptUsed}
          </pre>
        </Collapsible>
      )}
    </AdminCard>
  )
}

function ChunkCard({ chunk }: { chunk: RetrievedChunk }) {
  const scoreColor =
    chunk.score >= 0.7 ? 'text-emerald-600 dark:text-emerald-400'
    : chunk.score >= 0.4 ? 'text-amber-600 dark:text-amber-400'
    : 'text-rose-600 dark:text-rose-400'
  return (
    <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl px-4 py-3 flex items-center gap-3">
      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 w-5 flex-shrink-0 font-mono">#{chunk.rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[160px]">
            {chunk.documentChunkId.slice(0, 8)}…
          </span>
          {chunk.used && <span className="chip chip-emerald flex-shrink-0">RAG 사용</span>}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-indigo-500/70" style={{ width: `${chunk.score * 100}%` }} />
          </div>
          <span className={`text-[10.5px] font-mono flex-shrink-0 ${scoreColor}`}>{chunk.score.toFixed(3)}</span>
        </div>
      </div>
    </div>
  )
}

// 평가 점수 색 분기 (1~5점 스케일)
function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 4   ? 'text-emerald-600 dark:text-emerald-400' :
    score >= 2.5 ? 'text-amber-600 dark:text-amber-400'     :
    score > 1    ? 'text-orange-600 dark:text-orange-400'   :
                   'text-rose-600 dark:text-rose-400'
  return <span className={`font-semibold font-mono ${color}`}>{score.toFixed(2)}</span>
}

function MetaPair({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{label}</span>
      <span className="text-[12.5px] text-slate-800 dark:text-slate-100">{children}</span>
    </div>
  )
}

function Collapsible({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t border-slate-100 dark:border-slate-800/60 mt-3 pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
      >
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        {label}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}
