/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // gray 팔레트를 CSS 변수로 교체 → 다크/라이트 테마 전환 지원
        gray: {
          100: 'var(--gray-100)',
          200: 'var(--gray-200)',
          300: 'var(--gray-300)',
          400: 'var(--gray-400)',
          500: 'var(--gray-500)',
          600: 'var(--gray-600)',
          700: 'var(--gray-700)',
          800: 'var(--gray-800)',
          900: 'var(--gray-900)',
          950: 'var(--gray-950)',
        },
        brand: {
          50:  '#eef2ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        // 상태 시맨틱 컬러 — Alert 컴포넌트에서 사용
        // 라이트/다크 구분은 dark: prefix로 처리 (CSS var 아님)
        up:   '#ef4444',
        down: '#3b82f6',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
