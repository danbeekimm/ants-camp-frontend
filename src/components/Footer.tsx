import { Link } from 'react-router-dom'

const SERVICE_LINKS = [
  { label: '대회 소개',  to: '/competitions' },
  { label: '주식차트',    to: '/stock' },
  { label: '포트폴리오',  to: '/portfolio' },
  { label: '가이드',      to: '/guides' },
]

// 푸터 링크는 다른 페이지로의 진입점이므로 클릭 시 스크롤을 최상단으로 리셋
const scrollTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' })

export function Footer() {
  return (
    <footer className="bg-gray-950 border-t border-gray-800 mt-auto">
      <div className="max-w-screen-xl mx-auto px-6 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">

          {/* 로고 */}
          <Link to="/" onClick={scrollTop} className="flex items-center gap-2 flex-shrink-0">
            <div className="w-5 h-5 rounded-md bg-indigo-600 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                <path d="M3 17l6-6 4 4 8-8" />
              </svg>
            </div>
            <span className="font-bold text-gray-400 text-xs">AntCamp</span>
          </Link>

          {/* 링크 — 가로 한 줄 */}
          <nav className="flex items-center flex-wrap justify-center gap-x-5 gap-y-1">
            {SERVICE_LINKS.map(({ label, to }) => (
              <Link
                key={label}
                to={to}
                onClick={scrollTop}
                className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* 카피라이트 */}
          <p className="text-[11px] text-gray-500 flex-shrink-0">
            © 2026 AntCamp
          </p>

        </div>
      </div>
    </footer>
  )
}