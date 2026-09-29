import { supabase } from './supabase'

export type Notification = {
  id: string
  user_id: string
  kind: 'overdue' | 'due_soon' | 'reminder' | 'goal' | 'system'
  title: string
  body: string | null
  entity_type: string | null
  entity_id: string | null
  read_at: string | null
  created_at: string
}

function requireClient() { if (!supabase) throw new Error('Supabase is not configured.'); return supabase }

export async function refreshNotifications() {
  const { data, error } = await requireClient().rpc('refresh_due_notifications')
  if (error) throw error
  return Number(data ?? 0)
}

export async function listNotifications(limit = 30) {
  const { data, error } = await requireClient().from('notifications').select('*').order('created_at', { ascending: false }).limit(limit)
  if (error) throw error
  return (data ?? []) as Notification[]
}

export async function markNotificationRead(id: string) {
  const { error } = await requireClient().from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function markAllNotificationsRead() {
  const { error } = await requireClient().from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null)
  if (error) throw error
}
