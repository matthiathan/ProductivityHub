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
  weekly_task_target: number
  default_priority: 'low' | 'medium' | 'high' | 'critical'
  default_task_view: 'all' | 'today' | 'upcoming' | 'overdue' | 'completed'
  week_starts_on: number
  working_day_start: string
  working_day_end: string
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

async function recomputeTaskActualMinutes(taskId: string | null | undefined) {
  if (!taskId) return
  const client = requireClient()
  const [sessions, entries] = await Promise.all([
    client.from('focus_sessions').select('duration_minutes').eq('task_id', taskId).not('ended_at', 'is', null),
    client.from('time_entries').select('duration_minutes').eq('task_id', taskId),
  ])
  if (sessions.error) throw sessions.error
  if (entries.error) throw entries.error
  const total = [...(sessions.data ?? []), ...(entries.data ?? [])].reduce((sum, row) => sum + Number(row.duration_minutes ?? 0), 0)
  const { error } = await client.from('tasks').update({ actual_minutes: total }).eq('id', taskId)
  if (error) throw error
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

export async function listFocusSessions(limit = 50) {
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
  const session = data as FocusSession
  await recomputeTaskActualMinutes(session.task_id)
  return session
}

export async function updateFocusSession(id: string, changes: { duration_minutes?: number; title?: string | null; category?: FocusCategory; task_id?: string | null; project_id?: string | null }) {
  const client = requireClient()
  const existing = await client.from('focus_sessions').select('*').eq('id', id).single()
  if (existing.error) throw existing.error
  const row = existing.data as FocusSession
  const patch: Record<string, unknown> = { ...changes }
  if (changes.duration_minutes != null && row.ended_at) {
    patch.ended_at = new Date(new Date(row.started_at).getTime() + Math.max(1, changes.duration_minutes) * 60000).toISOString()
    delete patch.duration_minutes
  }
  const { data, error } = await client.from('focus_sessions').update(patch).eq('id', id).select('*').single()
  if (error) throw error
  const updated = data as FocusSession
  await Promise.all([recomputeTaskActualMinutes(row.task_id), recomputeTaskActualMinutes(updated.task_id)])
  return updated
}

export async function deleteFocusSession(id: string) {
  const client = requireClient()
  const existing = await client.from('focus_sessions').select('task_id').eq('id', id).single()
  if (existing.error) throw existing.error
  const { error } = await client.from('focus_sessions').delete().eq('id', id)
  if (error) throw error
  await recomputeTaskActualMinutes(existing.data.task_id)
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
  const entry = data as TimeEntry
  await recomputeTaskActualMinutes(entry.task_id)
  return entry
}

export async function updateManualTimeEntry(id: string, changes: Partial<Pick<TimeEntry, 'task_id' | 'project_id' | 'category' | 'description' | 'entry_date' | 'duration_minutes'>>) {
  const client = requireClient()
  const existing = await client.from('time_entries').select('*').eq('id', id).single()
  if (existing.error) throw existing.error
  const before = existing.data as TimeEntry
  const safeChanges = { ...changes, ...(changes.duration_minutes != null ? { duration_minutes: Math.max(1, changes.duration_minutes) } : {}) }
  const { data, error } = await client.from('time_entries').update(safeChanges).eq('id', id).select('*').single()
  if (error) throw error
  const updated = data as TimeEntry
  await Promise.all([recomputeTaskActualMinutes(before.task_id), recomputeTaskActualMinutes(updated.task_id)])
  return updated
}

export async function deleteManualTimeEntry(id: string) {
  const client = requireClient()
  const existing = await client.from('time_entries').select('task_id').eq('id', id).single()
  if (existing.error) throw existing.error
  const { error } = await client.from('time_entries').delete().eq('id', id)
  if (error) throw error
  await recomputeTaskActualMinutes(existing.data.task_id)
}

export async function listTimeEntries(limit = 50) {
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
