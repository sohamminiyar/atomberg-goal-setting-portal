import { create } from 'zustand'
import { authService } from '@/services/auth'
import { Profile } from '@/types/auth'

interface AuthState {
  user: any | null
  profile: Profile | null
  loading: boolean
  initialized: boolean
  fetchUser: () => Promise<void>
  clearUser: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: false,
  initialized: false,
  
  fetchUser: async () => {
    // Return early if already fetched to prevent duplicate DB queries
    if (get().initialized) return

    set({ loading: true })
    try {
      const user = await authService.getCurrentUser()
      if (user) {
        const profile = await authService.getUserProfile(user.id)
        set({ user, profile, initialized: true })
      } else {
        set({ user: null, profile: null, initialized: true })
      }
    } catch (err) {
      console.error('Auth store fetch failed:', err)
      set({ user: null, profile: null, initialized: true })
    } finally {
      set({ loading: false })
    }
  },
  
  clearUser: () => set({ user: null, profile: null, initialized: false })
}))
