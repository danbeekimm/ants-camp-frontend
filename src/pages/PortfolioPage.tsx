import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAccountDetail } from '@/services/authApi'
import { useAuthStore } from '@/store/authStore'
import type { AccountPortfolio } from '@/types/auth'

const fmt = (n: number) => n.toLocaleString('ko-KR')

export function PortfolioPage() {
  const { token, user } = useAuthStore()
  const navigate        = useNavigate()

  const [accountId, setAccountId]   = useState(localStorage.getItem('lastAccountId') ?? '')
  const [portfolio, setPortfolio]   = useState<AccountPortfolio | null>(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const fetchPortfolio = async () => {
    const id = accountId.trim()
    if (!id || !user) return
    setLoading(true); setError(null)
    localStorage.setItem('lastAccountId', id)
    try {
      const data = await getAccountDetail(id, user.userId, token ?? undefined)
      setPortfolio(data)
    } catch (e: any) {
      setError(e?.message ?? '자산 조회 실패')
    } finally {
      setLoading(false)
    }
  }

  const asset    = portfolio?.asset
  const holdings = portfolio?.holdings ?? []

  return (
    <div className="max-w-screen-lg mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-100">포트폴리오</h1>
      </div>

      {/* 계좌 ID 입력 */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
        <label className="text-xs text-gray-400 mb-2 block">계좌 ID</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchPortfolio()}
            placeholder="UUID"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm font-mono text-gray-100 placeholder-gray-600 outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            onClick={fetchPortfolio}
            disabled={loading || !accountId.trim()}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
            {loading ? '조회 중...' : '조회'}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      {!portfolio ? (
        <div className="text-center py-20 text-gray-600">계좌 ID를 입력하고 조회하세요.</div>
      ) : (
        <>
          {/* 자산 요약 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {asset && [
              ['총 자산',     asset.totalAssetAmount],
              ['주식 평가액', asset.holdingEvaluationAmount],
              ['현금 잔고',   asset.accountAmount],
            ].map(([label, value]) => (
              <div key={label as string} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <p className="text-[10px] text-gray-500 mb-1">{label}</p>
                <p className="text-sm font-mono font-bold text-gray-100">{fmt(value as number)}원</p>
              </div>
            ))}
          </div>

          {/* 보유 종목 */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-gray-200">보유 종목 ({holdings.length})</h2>
              <button onClick={() => navigate(`/account/${accountId}`)}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                상세 보기 →
              </button>
            </div>
            {holdings.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-4">보유 종목이 없습니다.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {holdings.map((h) => {
                  const evalAmt = h.finalPrice * h.stockAmount
                  const costAmt = h.buyPrice  * h.stockAmount
                  const totalVal = asset?.totalAssetAmount ?? 1
                  const pct = totalVal > 0 ? (evalAmt / totalVal * 100).toFixed(1) : '0'
                  const pl  = evalAmt - costAmt
                  const plRate = costAmt > 0 ? ((pl / costAmt) * 100) : 0

                  return (
                    <div key={h.holdingId}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-300 font-mono font-medium">{h.stockCode}
                          <span className="text-gray-600 ml-1">({h.stockAmount}주)</span>
                        </span>
                        <div className="flex gap-4">
                          <span className="text-gray-500">{pct}%</span>
                          <span className={`font-mono font-bold ${plRate >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                            {plRate >= 0 ? '+' : ''}{plRate.toFixed(2)}%
                          </span>
                          <span className="font-mono text-gray-300">{fmt(evalAmt)}원</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full transition-all"
                          style={{ width: `${Math.min(Number(pct), 100)}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
