import { create } from 'zustand'

interface ThemeStore {
  isDark: boolean
  toggle: () => void
}

const getInitial = (): boolean => {
  const stored = localStorage.getItem('theme')
  return stored ? stored === 'dark' : true   // 기본값: 다크 모드
}

export const useThemeStore = create<ThemeStore>((set) => ({
  isDark: getInitial(),
  toggle: () =>
    set((s) => {
      const next = !s.isDark
      localStorage.setItem('theme', next ? 'dark' : 'light')
      return { isDark: next }
    }),
}))
