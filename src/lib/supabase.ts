import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)
export const supabaseApiHost = supabaseUrl ? new URL(supabaseUrl).host : 'not configured'

export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  if (!supabaseUrl || !supabaseKey) {
    return { ok: false, message: 'Supabase environment variables are not configured.' }
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      method: 'GET',
      headers: { apikey: supabaseKey },
      cache: 'no-store',
    })

    if (response.ok) {
      return { ok: true, message: `Connected to ${supabaseApiHost}.` }
    }

    return {
      ok: false,
      message: `Reached ${supabaseApiHost}, but the auth health endpoint returned HTTP ${response.status}.`,
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return {
      ok: false,
      message: `Your browser could not reach ${supabaseApiHost}. This is a network, DNS, firewall, privacy-extension, or browser filtering problem. (${detail})`,
    }
  }
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
