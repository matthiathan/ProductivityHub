import { supabase } from './supabase'
import type { ProductivityWeights } from './productivityScore'
import type { UserSettings } from './tracking'

function requireClient() { if (!supabase) throw new Error('Supabase is not configured.'); return supabase }

export async function updateUserSettings(userId: string, changes: {
  daily_focus_target_minutes?: number
  weekly_focus_target_minutes?: number
  productivity_weights?: ProductivityWeights
}) {
  const { data, error } = await requireClient().from('user_settings').upsert({ user_id: userId, ...changes }, { onConflict: 'user_id' }).select('*').single()
  if (error) throw error
  return data as UserSettings
}
