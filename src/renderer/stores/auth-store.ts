import { create } from 'zustand'

interface AuthState {
  isLoggedIn: boolean
  url: string
  username: string
  loading: boolean
  error: string | null
  login: (url: string, username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  checkStoredCredentials: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  url: '',
  username: '',
  loading: false,
  error: null,

  login: async (url: string, username: string, password: string) => {
    set({ loading: true, error: null })
    try {
      const result = await window.api.auth.login({ url, username, password })
      if (result.success) {
        set({ isLoggedIn: true, url, username, loading: false })
        return true
      } else {
        set({ error: result.error, loading: false })
        return false
      }
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      return false
    }
  },

  logout: async () => {
    await window.api.auth.logout()
    set({ isLoggedIn: false, url: '', username: '' })
  },

  checkStoredCredentials: async () => {
    try {
      const credentials = await window.api.auth.getStoredCredentials()
      if (credentials) {
        set({
          isLoggedIn: true,
          url: credentials.url,
          username: credentials.username
        })
      }
    } catch {
      // 忽略错误
    }
  }
}))