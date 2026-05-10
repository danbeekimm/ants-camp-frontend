import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAccountDetail } from '@/services/authApi'
import { useAuthStore } from '@/store/authStore'
import type { AccountPortfolio } from '@/types/auth'

const fmt = (n: number) => n.toLocaleString('ko-KR')

export function AccountDetailPage() {
  const { accountId } = useParams<{ accountId: string }>()
  const navigate      = useNavigate()
  const { token, user } = useAuthStore()
  const [portfolio, setPortfolio] = useState<AccountPortfolio | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    if (!accountId || !user) return
    getAccountDetail(accountId, user.userId, token ?? undefined)
      .then(setPortfolio)
      .catch((e) => setError(e?.message ?? '계좌 정보를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [accountId, user, token])

  if (loading) return <div className="text-center py-20 text-gray-600">불러오는 중...</div>
  if (error || !portfolio) return (
    <div className="text-center py-20 text-red-400">
      {error ?? '계좌 정보를 불러오지 못했습니다.'}
      <br />
      <button onClick={() => navigate('/mypage')}
        className="mt-4 text-xs text-indigo-400 hover:text-indigo-300">← 마이페이지로</button>
    </div>
  )

  const { account, asset, holdings } = portfolio

  return (
    <div className="max-w-screen-md mx-auto px-6 py-8">
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>
        뒤로
      </button>

      {/* 자산 요약 */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-5">
        <div className="mb-1">
          <p className="text-xs text-gray-500">계좌번호</p>
          <p className="text-xs font-mono text-gray-400">{account.accountNumber}</p>
        </div>
        <p className="text-xs text-gray-500 mt-3 mb-1">총 자산</p>
        <p className="text-2xl font-bold font-mono text-gray-100">{fmt(asset.totalAssetAmount)}원</p>

        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            ['현금 잔고',   asset.accountAmount],
            ['주식 평가액', asset.holdingEvaluationAmount],
            ['총 자산',     asset.totalAssetAmount],
          ].map(([label, value]) => (
            <div key={label as string} className="bg-gray-800 rounded-xl py-2.5 px-3 text-center">
              <p className="text-[9px] text-gray-500 mb-0.5">{label}</p>
              <p className="text-xs font-mono font-semibold text-gray-200">{fmt(value as number)}원</p>
            </div>
          ))}
        </div>
      </div>

      {/* 보유 종목 */}
      <h2 className="text-sm font-bold text-gray-300 mb-3">보유 종목 ({holdings.length})</h2>
      {holdings.length === 0 ? (
        <p className="text-center py-10 text-gray-600 text-sm border border-dashed border-gray-800 rounded-2xl">
          보유 종목이 없습니다.
        </p>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-5">
          <div className="grid grid-cols-[1fr_70px_90px_90px] text-[10px] text-gray-500 px-4 py-3 border-b border-gray-800">
            <span>종목코드</span>
            <span className="text-right">수량</span>
            <span className="text-right">매수단가</span>
            <span className="text-right">현재단가</span>
          </div>
          {holdings.map((h) => (
            <div key={h.holdingId}
              className="grid grid-cols-[1fr_70px_90px_90px] items-center px-4 py-3 border-b border-gray-800 last:border-0 hover:bg-gray-800/40 transition-colors">
              <span className="text-xs font-mono text-gray-200">{h.stockCode}</span>
              <span className="text-right text-xs font-mono text-gray-300">{h.stockAmount}주</span>
              <span className="text-right text-xs font-mono text-gray-300">{fmt(h.buyPrice)}원</span>
              <span className={`text-right text-xs font-mono font-bold ${
                h.finalPrice >= h.buyPrice ? 'text-red-400' : 'text-blue-400'
              }`}>
                {fmt(h.finalPrice)}원
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
