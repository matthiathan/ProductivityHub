import { supabase } from './supabase'
import type { ProductivityWeights } from './productivityScore'
import type { UserSettings } from './tracking'

function requireClient() { if (!supabase) throw new Error('Supabase is not configured.'); return supabase }

export type UserSettingsChanges = {
  daily_focus_target_minutes?: number
  weekly_focus_target_minutes?: number
  productivity_weights?: ProductivityWeights
  weekly_task_target?: number
  default_priority?: 'low' | 'medium' | 'high' | 'critical'
  default_task_view?: 'all' | 'today' | 'upcoming' | 'overdue' | 'completed'
  week_starts_on?: number
  working_day_start?: string
  working_day_end?: string
}

export async function updateUserSettings(userId: string, changes: UserSettingsChanges) {
  const { data, error } = await requireClient().from('user_settings').upsert({ user_id: userId, ...changes }, { onConflict: 'user_id' }).select('*').single()
  if (error) throw error
  return data as UserSettings
}
