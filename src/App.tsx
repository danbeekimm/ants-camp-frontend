import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Header } from '@/components/Header'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'

// 페이지
import { LoginPage }              from '@/pages/LoginPage'
import { AdminLoginPage }         from '@/pages/AdminLoginPage'
import { RegisterPage }           from '@/pages/RegisterPage'
import { MainPage }               from '@/pages/MainPage'
import { CompetitionDetailPage }  from '@/pages/CompetitionDetailPage'
import { CompetitionDashboardPage } from '@/pages/CompetitionDashboardPage'
import { StockChartPage }         from '@/pages/StockChartPage'
import { MyPage }                 from '@/pages/MyPage'
import { ProfileEditPage }        from '@/pages/ProfileEditPage'
import { PortfolioPage }          from '@/pages/PortfolioPage'
import { AccountDetailPage }      from '@/pages/AccountDetailPage'
import { AdminPage }              from '@/pages/AdminPage'

/** 로그인 필요 라우트 */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" replace />
}

/** 어드민 전용 라우트 */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isAdmin } = useAuthStore()
  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (!isAdmin)    return <Navigate to="/"      replace />
  return <>{children}</>
}

export default function App() {
  const isDark = useThemeStore((s) => s.isDark)

  // html 요소에 dark 클래스 동기화
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-gray-100 font-[Noto_Sans_KR,sans-serif] flex flex-col">
        <Header />

        <main className="flex-1">
          <Routes>
            {/* 공개 */}
            <Route path="/login"        element={<LoginPage />} />
            <Route path="/admin/login"  element={<AdminLoginPage />} />
            <Route path="/register"     element={<RegisterPage />} />

            {/* 로그인 필요 */}
            <Route path="/"   element={<PrivateRoute><MainPage /></PrivateRoute>} />

            <Route path="/competitions/:id"
              element={<PrivateRoute><CompetitionDetailPage /></PrivateRoute>} />
            <Route path="/competitions/:id/dashboard"
              element={<PrivateRoute><CompetitionDashboardPage /></PrivateRoute>} />

            <Route path="/stock"
              element={<PrivateRoute><StockChartPage /></PrivateRoute>} />

            <Route path="/mypage"
              element={<PrivateRoute><MyPage /></PrivateRoute>} />
            <Route path="/mypage/edit"
              element={<PrivateRoute><ProfileEditPage /></PrivateRoute>} />

            <Route path="/portfolio"
              element={<PrivateRoute><PortfolioPage /></PrivateRoute>} />
            <Route path="/account/:accountId"
              element={<PrivateRoute><AccountDetailPage /></PrivateRoute>} />

            {/* 어드민 전용 */}
            <Route path="/admin"
              element={<AdminRoute><AdminPage /></AdminRoute>} />

            {/* fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
