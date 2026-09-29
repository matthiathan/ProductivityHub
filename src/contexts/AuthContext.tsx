import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type AuthContextValue = {
  session: Session | null
  loading: boolean
  configured: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<string | null>
  updatePassword: (password: string) => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    loading,
    configured: isSupabaseConfigured,
    async signIn(email, password) {
      if (!supabase) return 'Supabase has not been configured yet.'
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return error?.message ?? null
    },
    async signOut() {
      if (supabase) await supabase.auth.signOut()
    },
    async requestPasswordReset(email) {
      if (!supabase) return 'Supabase has not been configured yet.'
      const redirectTo = `${window.location.origin}/#/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      return error?.message ?? null
    },
    async updatePassword(password) {
      if (!supabase) return 'Supabase has not been configured yet.'
      const { error } = await supabase.auth.updateUser({ password })
      return error?.message ?? null
    },
  }), [loading, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
