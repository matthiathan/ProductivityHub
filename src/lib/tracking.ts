import { supabase } from './supabase'

export type FocusCategory = 'deep_work' | 'planning' | 'admin' | 'learning' | 'other'

export type FocusSession = {
  id: string
  user_id: string
  task_id: string | null
  project_id: string | null
  title: string | null
  category: FocusCategory
  started_at: string
  ended_at: string | null
  duration_minutes: number
  created_at: string
  updated_at: string
}

export type TimeEntry = {
  id: string
  user_id: string
  task_id: string | null
  project_id: string | null
  category: FocusCategory
  description: string | null
  entry_date: string
  duration_minutes: number
  created_at: string
  updated_at: string
}

export type UserSettings = {
  user_id: string
  daily_focus_target_minutes: number
  weekly_focus_target_minutes: number
  productivity_weights: Record<string, number>
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function getActiveFocusSession() {
  const client = requireClient()
  const { data, error } = await client
    .from('focus_sessions')
    .select('*')
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .maybeSingle()
  if (error) throw error
  return (data ?? null) as FocusSession | null
}

export async function listFocusSessions(limit = 20) {
  const client = requireClient()
  const { data, error } = await client
    .from('focus_sessions')
    .select('*')
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as FocusSession[]
}

export async function startFocusSession(input: {
  user_id: string
  task_id?: string | null
  project_id?: string | null
  title?: string | null
  category: FocusCategory
}) {
  const client = requireClient()
  const { data, error } = await client.from('focus_sessions').insert(input).select('*').single()
  if (error) throw error
  return data as FocusSession
}

export async function stopFocusSession(id: string) {
  const client = requireClient()
  const { data, error } = await client
    .from('focus_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as FocusSession
}

export async function addManualTimeEntry(input: {
  user_id: string
  task_id?: string | null
  project_id?: string | null
  category: FocusCategory
  description?: string | null
  entry_date: string
  duration_minutes: number
}) {
  const client = requireClient()
  const { data, error } = await client.from('time_entries').insert(input).select('*').single()
  if (error) throw error
  return data as TimeEntry
}

export async function listTimeEntries(limit = 20) {
  const client = requireClient()
  const { data, error } = await client
    .from('time_entries')
    .select('*')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as TimeEntry[]
}

export async function getUserSettings(userId: string) {
  const client = requireClient()
  const { data, error } = await client.from('user_settings').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (data) return data as UserSettings

  const created = await client.from('user_settings').insert({ user_id: userId }).select('*').single()
  if (created.error) throw created.error
  return created.data as UserSettings
}
