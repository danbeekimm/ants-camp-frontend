import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

/** 프로필 수정 API가 백엔드에 없어 현재 정보 표시만 합니다. */
export function ProfileEditPage() {
  const navigate     = useNavigate()
  const { user }     = useAuthStore()

  return (
    <div className="min-h-[calc(100vh-57px)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-100 mb-8 text-center">내 정보</h1>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">이메일</label>
            <input type="email" value={user?.email ?? ''} disabled
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">이름</label>
            <input type="text" value={user?.name ?? ''} disabled
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">전화번호</label>
            <input type="text" value={user?.phone ?? ''} disabled
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">역할</label>
            <input type="text" value={user?.role ?? ''} disabled
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-500 cursor-not-allowed" />
          </div>

          <p className="text-xs text-gray-600 text-center mt-2">
            프로필 수정 기능은 현재 준비 중입니다.
          </p>

          <button onClick={() => navigate('/mypage')}
            className="w-full py-3 rounded-xl border border-gray-700 text-gray-400 text-sm hover:border-gray-500 transition-colors">
            마이페이지로 돌아가기
          </button>
        </div>
      </div>
    </div>
  )
}
