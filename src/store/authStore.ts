import { create } from 'zustand'
import type { User } from '@/types/auth'

interface AuthStore {
  user: User | null
  token: string | null
  isLoggedIn: boolean
  isAdmin: boolean

  setAuth: (user: User, token: string, refreshToken?: string) => void
  logout: () => void
}

const storedUser = (() => {
  try { return JSON.parse(localStorage.getItem('user') ?? 'null') as User | null }
  catch { return null }
})()

export const useAuthStore = create<AuthStore>((set) => ({
  user:       storedUser,
  token:      localStorage.getItem('accessToken'),
  isLoggedIn: !!localStorage.getItem('accessToken'),
  isAdmin:    storedUser?.role === 'ADMIN' || storedUser?.role === 'MANAGER',

  setAuth: (user, token, refreshToken) => {
    localStorage.setItem('accessToken', token)
    localStorage.setItem('user', JSON.stringify(user))
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
    set({
      user,
      token,
      isLoggedIn: true,
      isAdmin: user.role === 'ADMIN' || user.role === 'MANAGER',
    })
  },

  logout: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    set({ user: null, token: null, isLoggedIn: false, isAdmin: false })
  },
}))
