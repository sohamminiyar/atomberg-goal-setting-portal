import { createClient } from '@/utils/supabase/client'
import { UserRole, Profile } from '@/types/auth'

const supabase = createClient()

export const authService = {
  async signUp(email: string, password: string, fullName: string, role: UserRole) {
    // 1. Sign up the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('Signup failed')

    // 2. Create the profile in the profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: fullName,
        email: email,
        role: role,
      })

    if (profileError) {
      // If profile creation fails, we might want to delete the auth user, 
      // but for simplicity in this demo we'll just throw the error.
      throw profileError
    }

    return authData.user
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data.user
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  async getUserProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }

    return data as Profile
  },

  async getUserRole(userId: string): Promise<UserRole | null> {
    const profile = await this.getUserProfile(userId)
    return profile?.role || null
  }
}
