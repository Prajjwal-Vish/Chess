import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '../api/auth'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
  setAuth: (user: AuthUser, token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken) =>
        set({ user, accessToken, isAuthenticated: true }),

      clearAuth: () =>
        set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    {
      name: 'chess-auth', // key in localStorage
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)