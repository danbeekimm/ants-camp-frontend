import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, X as XIcon } from 'lucide-react'
import {
  generateQuestions,
  runEvaluation,
  listPromptVersions,
  JUDGE_MODELS,
  RAG_MODELS,
  type PromptVersion,
  type EvalQuestion,
} from '@/services/assistantApi'
import { AdminBackHeader, AdminCard, AdminSelect } from '@/components/admin'

interface QuestionItem extends EvalQuestion {
  id: string
  generated: boolean  // true = 자동 생성(읽기 전용), false = 수동 추가(편집 가능)
}

export function EvalRunPage() {
  const navigate = useNavigate()

  const [questions, setQuestions] = useState<QuestionItem[]>([])
  const [generateCount, setGenerateCount] = useState(5)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)

  const [judgeModels, setJudgeModels] = useState<string[]>([JUDGE_MODELS[0]])
  const [ragModel, setRagModel] = useState<string>(RAG_MODELS[0])
  const [promptVersionId, setPromptVersionId] = useState<string | null>(null)
  const [memo, setMemo] = useState('')
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([])

  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    listPromptVersions().then(setPromptVersions).catch(() => {})
  }, [])

  const addQuestion = () =>
    setQuestions((prev) => [
      ...prev,
      { id: `q-${Date.now()}`, question: '', referenceAnswer: null, generated: false },
    ])

  const updateQuestion = (id: string, field: keyof EvalQuestion, value: string) =>
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value || null } : q)),
    )

  const removeQuestion = (id: string) =>
    setQuestions((prev) => prev.filter((q) => q.id !== id))

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const result = await generateQuestions(generateCount)
      setQuestions((prev) => [
        ...prev,
        ...result.map((g, i) => ({ id: `g-${Date.now()}-${i}`, ...g, generated: true })),
      ])
      setGenerated(true)
    } catch (e) {
      alert(e instanceof Error ? e.message : '자동 생성에 실패했습니다.')
    } finally {
      setGenerating(false)
    }
  }

  const handleResetGenerated = () => {
    setQuestions((prev) => prev.filter((q) => !q.generated))
    setGenerated(false)
  }

  const toggleJudge = (model: string) =>
    setJudgeModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model],
    )

  const handleRun = async () => {
    if (questions.length === 0) { alert('질문을 1개 이상 추가해주세요.'); return }
    if (questions.some((q) => !q.question.trim())) { alert('빈 질문이 있습니다.'); return }
    if (judgeModels.length === 0) { alert('Judge 모델을 1개 이상 선택해주세요.'); return }

    setSubmitting(true)
    try {
      const { runId } = await runEvaluation({
        questions: questions.map(({ question, referenceAnswer }) => ({
          question,
          referenceAnswer: referenceAnswer?.trim() || null,
        })),
        judgeModels,
        promptVersionId,
        ragModel,
        memo,
      })
      navigate(`/admin/assistant/evaluations/${runId}`)
    } catch (e) {
      alert(e instanceof Error ? e.message : '평가 실행에 실패했습니다.')
      setSubmitting(false)
    }
  }

  return (
    <div>
      <AdminBackHeader
        back="/admin/assistant/evaluations"
        kicker="Assistant · New Evaluation"
        title={
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="평가 제목을 입력하세요..."
            className="w-full bg-transparent border-0 border-b-2 border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none pb-1 text-[26px] font-bold tracking-tight text-slate-900 dark:text-slate-50 placeholder:text-slate-300 dark:placeholder:text-slate-700 transition-colors"
          />
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start">
        {/* 좌측: 질문 영역 */}
        <div className="flex flex-col gap-4">
          {/* 자동 생성 바 */}
          <AdminCard label="자동 생성" right={generated ? <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />완료</span> : undefined}>
            {generated ? (
              <div className="flex items-center gap-3">
                <span className="text-[15px] font-mono font-semibold text-indigo-700 dark:text-indigo-300">{generateCount}개</span>
                <span className="text-[12.5px] text-slate-500 dark:text-slate-400">자동 생성된 질문이 추가되었습니다</span>
                <button
                  onClick={handleResetGenerated}
                  className="ml-auto text-[12.5px] px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  재생성
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={5}
                  max={10}
                  value={generateCount}
                  disabled={generating}
                  onChange={(e) => setGenerateCount(Math.min(10, Math.max(5, Number(e.target.value))))}
                  className="w-16 bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-[13.5px] text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 text-center disabled:opacity-50"
                />
                <span className="text-[12.5px] text-slate-500 dark:text-slate-400">개 (5~10)</span>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="ml-auto text-[12.5px] font-semibold px-4 py-2 rounded-lg bg-slate-900 dark:bg-white hover:opacity-90 text-white dark:text-slate-900 disabled:opacity-50 transition-all"
                >
                  {generating ? '생성 중...' : '생성'}
                </button>
              </div>
            )}
          </AdminCard>

          {/* 질문 카드 목록 */}
          <div className="flex flex-col gap-3">
            {questions.length === 0 ? (
              <p className="text-center py-12 text-[12.5px] text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                질문을 추가하거나 자동 생성해주세요.
              </p>
            ) : (
              questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Q{idx + 1}</span>
                    <button
                      onClick={() => removeQuestion(q.id)}
                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 질문 */}
                  <div>
                    {q.generated ? (
                      <>
                        <p className="text-[10.5px] text-indigo-700 dark:text-indigo-400 mb-1.5 flex items-center gap-1.5 font-semibold uppercase tracking-wider">
                          <span className="w-1 h-1 rounded-full bg-indigo-500" />
                          자동 생성
                        </p>
                        <p className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl px-3.5 py-2.5 text-[13.5px] text-slate-900 dark:text-slate-100 leading-relaxed select-text">
                          {q.question}
                        </p>
                      </>
                    ) : (
                      <textarea
                        value={q.question}
                        onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                        placeholder="질문을 입력하세요"
                        rows={2}
                        className="w-full bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-[13.5px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/10 resize-none transition-all"
                      />
                    )}
                  </div>

                  {/* 참조 답변 */}
                  <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      참조 답변 <span className="text-slate-400 dark:text-slate-500 normal-case font-normal">(선택 — Judge 채점 기준)</span>
                    </p>
                    {q.generated ? (
                      <p className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed select-text min-h-[60px]">
                        {q.referenceAnswer || <span className="text-slate-400 italic">없음</span>}
                      </p>
                    ) : (
                      <textarea
                        value={q.referenceAnswer ?? ''}
                        onChange={(e) => updateQuestion(q.id, 'referenceAnswer', e.target.value)}
                        placeholder="정답 예시를 입력하면 더 정확한 채점이 가능합니다"
                        rows={2}
                        className="w-full bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-[13.5px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/10 resize-none transition-all"
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 질문 추가 버튼 */}
          <button
            onClick={addQuestion}
            className="w-full py-3 border border-dashed border-slate-300 hover:border-indigo-400 dark:border-slate-700 dark:hover:border-indigo-500/60 text-slate-500 hover:text-indigo-700 dark:hover:text-indigo-300 text-[13px] font-medium rounded-2xl transition-colors"
          >
            + 질문 추가
          </button>
        </div>

        {/* 우측: 설정 패널 */}
        <aside className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col gap-5 sticky top-6">
          {/* Judge 모델 */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Judge 모델</p>
              <span className="text-[10.5px] text-slate-400 dark:text-slate-500">{judgeModels.length}개 선택</span>
            </div>
            <div className="flex flex-col gap-2">
              {JUDGE_MODELS.map((model) => {
                const active = judgeModels.includes(model)
                return (
                  <button
                    key={model}
                    onClick={() => toggleJudge(model)}
                    className={
                      active
                        ? 'flex items-center justify-between px-3.5 py-2.5 rounded-xl border-2 text-left bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-500/15 dark:border-indigo-500/40 dark:text-indigo-200'
                        : 'flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left bg-white dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 transition-colors'
                    }
                  >
                    <span className="text-[12.5px] font-mono">{model}</span>
                    {active && (
                      <span className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                        <svg width="8" height="8" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24">
                          <path d="M5 13l4 4L19 7"/>
                        </svg>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800" />

          {/* RAG 모델 */}
          <div className="flex flex-col gap-2.5">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">RAG 모델</p>
            <div className="flex flex-col gap-2">
              {RAG_MODELS.map((m) => {
                const active = ragModel === m
                return (
                  <button
                    key={m}
                    onClick={() => setRagModel(m)}
                    className={
                      active
                        ? 'flex items-center justify-between px-3.5 py-2.5 rounded-xl border-2 text-left bg-cyan-50 border-cyan-300 text-cyan-700 dark:bg-cyan-500/15 dark:border-cyan-500/40 dark:text-cyan-200'
                        : 'flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left bg-white dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 transition-colors'
                    }
                  >
                    <span className="text-[12.5px] font-mono">{m}</span>
                    {active && (
                      <span className="w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0">
                        <svg width="8" height="8" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24">
                          <path d="M5 13l4 4L19 7"/>
                        </svg>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800" />

          {/* 프롬프트 버전 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">프롬프트 버전</label>
            <AdminSelect
              value={promptVersionId ?? ''}
              onChange={(v) => setPromptVersionId(v || null)}
              ariaLabel="프롬프트 버전"
              widthClass="w-full"
              options={[
                { value: '', label: '기본 (시스템 기본값)' },
                ...promptVersions.map((v) => ({
                  value: v.promptVersionId,
                  label: v.name,
                })),
              ]}
            />
          </div>

          {/* 실행 버튼 */}
          <button
            onClick={handleRun}
            disabled={submitting || questions.length === 0 || judgeModels.length === 0}
            className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white hover:opacity-90 text-white dark:text-slate-900 text-[13.5px] font-semibold disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            {submitting ? '실행 중...' : (
              <>
                <Play className="w-3.5 h-3.5" strokeWidth={2.5} />
                평가 실행
              </>
            )}
          </button>

          <p className="text-[10.5px] text-slate-400 dark:text-slate-500 text-center">
            질문 {questions.length}개 · Judge {judgeModels.length}개
          </p>
        </aside>
      </div>
    </div>
  )
}
