// RAG 모델(평가 대상)을 표시하는 칩. 샘플 가이드에 따라 emerald + mono.
export function RagModelChip({ model }: { model: string }) {
  return (
    <span
      className="chip chip-emerald"
      style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}
    >
      {model}
    </span>
  )
}
