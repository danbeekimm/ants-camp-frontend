import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Plus, Play } from 'lucide-react'
import {
  listEvalResults,
  JUDGE_MODELS,
  type EvalResultItem,
} from '@/services/assistantApi'
import { useCursorList } from '@/hooks/useCursorList'
import { LoadingDots } from '@/components/ui/Spinner'
import { RagModelChip } from '@/components/ui/RagModelChip'
import { DatePicker } from '@/components/ui/DatePicker'
import { formatDate } from '@/utils/formatDate'
import { Alert } from '@/components/ui/Alert'
import {
  loadPairwiseHistory,
  PAIRWISE_HISTORY_KEY,
  type PairwiseHistoryItem,
} from '@/utils/pairwiseHistory'
import { AdminPageHeader, AdminButton, StatCard, AdminSelect } from '@/components/admin'

// ── runId별 집계 ──────────────────────────────────────────────────────────────
interface RunRow {
  runId: string
  judgeModels: string[]
  ragModel: string
  memo: string | null
  runAt: string
  questionCount: number
  avgRelevance: number | null
  avgFaithfulness: number | null
  avgContextPrecision: number | null
}

function buildRunRows(items: EvalResultItem[]): RunRow[] {
  const map = new Map<string, EvalResultItem[]>()
  for (const item of items) {
    if (!map.has(item.runId)) map.set(item.runId, [])
    map.get(item.runId)!.push(item)
  }
  return Array.from(map.entries()).map(([runId, runItems]) => {
    const avg = (field: 'relevance' | 'faithfulness' | 'contextPrecision') => {
      const vals = runItems.map((i) => i.score[field]).filter((v): v is number => v != null)
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    }
    return {
      runId,
      judgeModels: runItems[0]?.judgeModels ?? [],
      ragModel:    runItems[0]?.ragModel    ?? '',
      memo:        runItems[0]?.memo        ?? null,
      runAt:       runItems[0]?.runAt       ?? '',
      questionCount: new Set(runItems.map((i) => i.question)).size,
      avgRelevance:        avg('relevance'),
      avgFaithfulness:     avg('faithfulness'),
      avgContextPrecision: avg('contextPrecision'),
    }
  })
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
type Tab = 'list' | 'pairwise'

export function EvalListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = (searchParams.get('tab') as Tab) ?? 'list'
  const setTab = (t: Tab) => setSearchParams(t === 'list' ? {} : { tab: t })

  // 통계용 — 1회 전체 로드 후 집계
  const [allRows, setAllRows] = useState<RunRow[]>([])
  useEffect(() => {
    listEvalResults()
      .then((res) => setAllRows(buildRunRows(res.content)))
      .catch(() => {})
  }, [])

  const stats = useMemo(() => {
    const total = allRows.length
    const judgeSet = new Set<string>()
    const ragSet   = new Set<string>()
    let avgRel = 0
    let relCount = 0
    allRows.forEach((r) => {
      r.judgeModels.forEach((m) => judgeSet.add(m))
      if (r.ragModel) ragSet.add(r.ragModel)
      if (r.avgRelevance != null) { avgRel += r.avgRelevance; relCount++ }
    })
    return {
      total,
      judges: judgeSet.size,
      rags:   ragSet.size,
      avgRel: relCount ? avgRel / relCount : null,
    }
  }, [allRows])

  return (
    <div className="pb-8 min-h-[calc(100vh-200px)]">
      <AdminPageHeader
        kicker="Assistant · Evaluations"
        title="평가"
        subtitle="RAG 답변 품질을 LLM Judge 로 채점하고, 모델·프롬프트 변경에 따른 회귀를 추적합니다."
        action={
          <AdminButton
            variant="primary"
            icon={<Plus className="w-3.5 h-3.5" strokeWidth={2.5} />}
            onClick={() => navigate('/admin/assistant/evaluations/new')}
          >
            새 평가 실행
          </AdminButton>
        }
      />

      {/* 통계 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="총 평가 Run"  value={stats.total} tone="neutral" />
        <StatCard label="평균 관련성"  value={stats.avgRel != null ? stats.avgRel.toFixed(2) : '—'} tone="emerald" hint="1~5 스케일" />
        <StatCard label="사용된 Judge" value={stats.judges} tone="indigo" />
        <StatCard label="사용된 RAG"   value={stats.rags}   tone="sky" />
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-5 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-1 w-fit">
        {(['list', 'pairwise'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              activeTab === t
                ? 'text-[12.5px] font-semibold px-4 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'text-[12.5px] font-medium px-4 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }
          >
            {t === 'list' ? '평가 목록' : 'Pairwise 비교'}
          </button>
        ))}
      </div>

      {activeTab === 'list' ? <EvalList /> : <PairwiseSection />}
    </div>
  )
}

// ── 평가 목록 탭 ──────────────────────────────────────────────────────────────
function EvalList() {
  const navigate = useNavigate()
  const [judgeModel, setJudgeModel] = useState('')
  const [startDate,  setStartDate]  = useState('')
  const [endDate,    setEndDate]    = useState('')

  const fetcher = useCallback(
    (cursor?: string) => listEvalResults({
      judgeModel: judgeModel || undefined,
      startDate:  startDate  || undefined,
      endDate:    endDate    || undefined,
      lastUpdatedAt: cursor,
    }),
    [judgeModel, startDate, endDate],
  )

  const { items, hasNext, loading, error, loadMore } = useCursorList(
    useCallback(async (cursor?: string) => {
      const res = await fetcher(cursor)
      return { items: res.content, hasNext: res.hasNext, nextCursor: res.nextCursor }
    }, [fetcher]),
  )

  const rows = useMemo(() => buildRunRows(items), [items])

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <AdminSelect
          value={judgeModel}
          onChange={setJudgeModel}
          placeholder="Judge 전체"
          ariaLabel="Judge 모델 필터"
          widthClass="w-[200px]"
          options={[
            { value: '', label: 'Judge 전체' },
            ...JUDGE_MODELS.map((m) => ({ value: m, label: m, mono: true })),
          ]}
        />
        <div className="flex items-center gap-2">
          <DatePicker value={startDate} onChange={setStartDate} placeholder="시작일" className="w-[150px]" />
          <span className="text-slate-400 text-sm">~</span>
          <DatePicker value={endDate} onChange={setEndDate} placeholder="종료일" className="w-[150px]" />
        </div>
        {(judgeModel || startDate || endDate) && (
          <button
            onClick={() => { setJudgeModel(''); setStartDate(''); setEndDate('') }}
            className="text-[12px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            필터 초기화
          </button>
        )}
      </div>

      {error && <Alert className="mb-4">{error}</Alert>}

      {!loading && rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <Play className="w-7 h-7 text-slate-400 mb-3" strokeWidth={1.75} />
          <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-200">평가 결과가 없습니다</p>
          <p className="text-[12px] text-slate-500 dark:text-slate-500 mt-1">우측 상단 “새 평가 실행”으로 첫 평가를 시작하세요</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => {
            const title = row.memo || formatDate(row.runAt) || row.runId.slice(0, 8) + '…'
            return (
              <button
                key={row.runId}
                onClick={() => navigate(`/admin/assistant/evaluations/${row.runId}`)}
                className="group bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(15,23,42,0.12)] dark:hover:shadow-[0_14px_36px_-14px_rgba(0,0,0,0.55)] rounded-2xl px-5 py-4 flex items-center gap-5 text-left transition-all w-full"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold text-slate-900 dark:text-slate-100 truncate">{title}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="text-[10.5px] text-slate-400 dark:text-slate-500 font-mono">{row.runId.slice(0, 8)}…</span>
                    <RagModelChip model={row.ragModel} />
                    {row.judgeModels.map((m) => (
                      <span key={m} className="chip chip-indigo" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{m}</span>
                    ))}
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-5 flex-shrink-0">
                  <ScoreCol label="관련성"   value={row.avgRelevance} />
                  <ScoreCol label="충실도"   value={row.avgFaithfulness} />
                  <ScoreCol label="컨텍스트" value={row.avgContextPrecision} />
                  <div className="text-center w-14">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">질문</p>
                    <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-200">{row.questionCount}</p>
                  </div>
                </div>
                <p className="text-[10.5px] text-slate-400 dark:text-slate-500 flex-shrink-0 hidden md:block font-mono">{formatDate(row.runAt)}</p>
              </button>
            )
          })}
          {loading && <div className="flex justify-center py-8"><LoadingDots /></div>}
          {hasNext && !loading && (
            <button
              onClick={loadMore}
              className="mt-2 w-full py-3 text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl transition-colors"
            >
              더 보기 ↓
            </button>
          )}
        </div>
      )}
    </>
  )
}

// ── Pairwise 탭 ──────────────────────────────────────────────────────────────
function PairwiseSection() {
  const navigate = useNavigate()
  const [allItems, setAllItems] = useState<EvalResultItem[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [selected, setSelected] = useState<string[]>([])
  const [history, setHistory]   = useState<PairwiseHistoryItem[]>(() => loadPairwiseHistory())
  const [historyExpanded, setHistoryExpanded] = useState(false)

  useEffect(() => {
    listEvalResults()
      .then((res) => setAllItems(res.content))
      .catch(() => {})
      .finally(() => setListLoading(false))
  }, [])

  const rows = useMemo(() => buildRunRows(allItems), [allItems])
  const selectedRows = useMemo(() => rows.filter((r) => selected.includes(r.runId)), [rows, selected])

  const [commonQuestionCount, setCommonQuestionCount] = useState<number | null>(null)
  const [loadingCommon, setLoadingCommon] = useState(false)

  useEffect(() => {
    setCommonQuestionCount(null)
    if (selected.length !== 2) return
    setLoadingCommon(true)
    Promise.all([
      listEvalResults({ runId: selected[0] }),
      listEvalResults({ runId: selected[1] }),
    ]).then(([resA, resB]) => {
      const qA = new Set(resA.content.map((i) => i.question))
      const qB = new Set(resB.content.map((i) => i.question))
      setCommonQuestionCount([...qA].filter((q) => qB.has(q)).length)
    }).catch(() => {})
    .finally(() => setLoadingCommon(false))
  }, [selected.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleRun = (runId: string) =>
    setSelected((prev) =>
      prev.includes(runId) ? prev.filter((id) => id !== runId)
      : prev.length >= 2   ? prev
      : [...prev, runId],
    )

  const sameModel   = selectedRows.length === 2 && selectedRows[0].ragModel === selectedRows[1].ragModel
  const noCommon    = !loadingCommon && commonQuestionCount === 0
  const canNavigate = selectedRows.length === 2 && !sameModel && !noCommon && !loadingCommon

  return (
    <div className="flex flex-col gap-4">
      {/* 히스토리 */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">완료된 비교 ({history.length})</span>
            <button
              onClick={() => { localStorage.removeItem(PAIRWISE_HISTORY_KEY); setHistory([]) }}
              className="text-[10.5px] text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              전체 삭제
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {(historyExpanded ? history : history.slice(0, 3)).map((h, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                  <RagModelChip model={h.ragModelA} />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">vs</span>
                  <RagModelChip model={h.ragModelB} />
                  {(h.memoA || h.memoB) && (
                    <span className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">{h.memoA || h.memoB}</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0 font-mono">{formatDate(h.savedAt)}</span>
                <Link
                  to={`/admin/assistant/evaluations/pairwise?evalRunIdA=${h.runIdA}&evalRunIdB=${h.runIdB}`}
                  className="flex-shrink-0 text-[11.5px] font-medium text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-200 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                >
                  보기 →
                </Link>
              </div>
            ))}
          </div>
          {history.length > 3 && (
            <button
              onClick={() => setHistoryExpanded((v) => !v)}
              className="w-full py-2 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors border-t border-slate-100 dark:border-slate-800/60"
            >
              {historyExpanded ? '접기 ↑' : `${history.length - 3}개 더 보기 ↓`}
            </button>
          )}
        </div>
      )}

      <p className="text-[12.5px] text-slate-500 dark:text-slate-400">비교할 평가 Run 2개를 선택하세요.</p>

      {/* 선택된 항목 */}
      {selectedRows.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-3">
            {selectedRows.map((r, i) => (
              <div
                key={r.runId}
                className={
                  i === 0
                    ? 'flex-1 border-2 rounded-xl px-4 py-3 text-[12px] flex items-start justify-between gap-2 bg-indigo-50 border-indigo-300 dark:bg-indigo-500/10 dark:border-indigo-500/40'
                    : 'flex-1 border-2 rounded-xl px-4 py-3 text-[12px] flex items-start justify-between gap-2 bg-violet-50 border-violet-300 dark:bg-violet-500/10 dark:border-violet-500/40'
                }
              >
                <div className="min-w-0">
                  <p className={`text-[10.5px] font-bold tracking-wider mb-0.5 ${i === 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-violet-700 dark:text-violet-300'}`}>
                    RUN {i === 0 ? 'A' : 'B'}
                  </p>
                  <p className="text-slate-900 dark:text-slate-100 font-semibold truncate">{r.memo || formatDate(r.runAt)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <RagModelChip model={r.ragModel} />
                    <span className="text-[10.5px] text-slate-500 dark:text-slate-400">질문 {r.questionCount}개</span>
                  </div>
                </div>
                <button
                  onClick={() => toggleRun(r.runId)}
                  className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex-shrink-0 transition-colors text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ))}
            {selectedRows.length === 1 && (
              <div className="flex-1 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center justify-center text-[12px] text-slate-500">
                Run B 선택 필요
              </div>
            )}
          </div>

          {/* 검증 메시지 */}
          {selectedRows.length === 2 && sameModel && (
            <Alert variant="error">두 Run의 RAG 모델이 동일합니다 ({selectedRows[0].ragModel}). 서로 다른 모델 비교 시 의미가 있습니다.</Alert>
          )}
          {selectedRows.length === 2 && !loadingCommon && commonQuestionCount === 0 && (
            <Alert variant="error">공통 질문이 없습니다. 동일한 질문 셋으로 평가된 Run을 선택해야 합니다.</Alert>
          )}
          {selectedRows.length === 2 && !loadingCommon && commonQuestionCount !== null && commonQuestionCount > 0 && (
            <Alert variant="success">공통 질문 {commonQuestionCount}개 확인됨. Pairwise 비교 가능합니다.</Alert>
          )}
          {selectedRows.length === 2 && loadingCommon && (
            <p className="text-[12px] text-slate-500 dark:text-slate-400">공통 질문 확인 중...</p>
          )}
        </div>
      )}

      {/* 비교 시작 버튼 */}
      {selected.length === 2 && (
        <button
          onClick={() => navigate(`/admin/assistant/evaluations/pairwise/new?a=${selected[0]}&b=${selected[1]}`)}
          disabled={!canNavigate}
          className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-[14px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
        >
          {loadingCommon ? (
            <><LoadingDots /><span>공통 질문 확인 중...</span></>
          ) : (
            <>
              <Play className="w-4 h-4" strokeWidth={2.5} />
              비교 설정 페이지로
            </>
          )}
        </button>
      )}

      {/* Run 목록 */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto] text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
          <span className="w-8">선택</span>
          <span>평가 Run</span>
          <span className="hidden sm:block">점수</span>
        </div>
        {listLoading ? (
          <div className="flex justify-center py-10"><LoadingDots /></div>
        ) : rows.length === 0 ? (
          <p className="text-center py-10 text-slate-500 text-sm">평가 결과가 없습니다.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {rows.map((row) => {
              const isSelected = selected.includes(row.runId)
              const isDisabled = selected.length >= 2 && !isSelected
              const title = row.memo || formatDate(row.runAt) || row.runId.slice(0, 8) + '…'
              const selIdx = selected.indexOf(row.runId)
              return (
                <button
                  key={row.runId}
                  onClick={() => !isDisabled && toggleRun(row.runId)}
                  disabled={isDisabled}
                  className={`w-full grid grid-cols-[auto_1fr_auto] items-center px-5 py-3 text-left transition-colors ${
                    isSelected
                      ? selIdx === 0 ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'bg-violet-50 dark:bg-violet-500/10'
                      : isDisabled ? 'opacity-40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="w-8 flex justify-center">
                    {isSelected ? (
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${selIdx === 0 ? 'bg-indigo-600' : 'bg-violet-600'}`}>
                        {selIdx === 0 ? 'A' : 'B'}
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-700" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">{title}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <RagModelChip model={row.ragModel} />
                      {row.judgeModels.map((m) => (
                        <span key={m} className="chip chip-indigo" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{m}</span>
                      ))}
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                    <ScoreCol label="관련성" value={row.avgRelevance} />
                    <ScoreCol label="충실도" value={row.avgFaithfulness} />
                    <p className="text-[10.5px] text-slate-400 dark:text-slate-500 w-20 text-right font-mono">{formatDate(row.runAt)}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── 공통 ─────────────────────────────────────────────────────────────────────
function ScoreCol({ label, value }: { label: string; value: number | null }) {
  const color = value == null
    ? 'text-slate-400 dark:text-slate-500'
    : value >= 4
      ? 'text-emerald-600 dark:text-emerald-400'
      : value >= 2.5
        ? 'text-amber-600 dark:text-amber-400'
        : value > 1
          ? 'text-orange-600 dark:text-orange-400'
          : 'text-rose-600 dark:text-rose-400'
  return (
    <div className="text-center w-16">
      <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">{label}</p>
      <p className={`text-[15px] font-bold font-mono ${color}`}>{value != null ? value.toFixed(2) : '—'}</p>
    </div>
  )
}
