import { supabase } from './supabase'

export type CalendarItem = {
  id: string
  date: string
  type: 'task' | 'project' | 'goal'
  title: string
  status: string
}

function requireClient() { if (!supabase) throw new Error('Supabase is not configured.'); return supabase }

export async function listCalendarItems() {
  const client = requireClient()
  const [tasks, projects, goals] = await Promise.all([
    client.from('tasks').select('id,title,due_at,status').eq('is_recurring', false).is('archived_at', null).not('due_at', 'is', null),
    client.from('projects').select('id,name,target_date,status').not('target_date', 'is', null),
    client.from('goals').select('id,name,target_date,status').not('target_date', 'is', null),
  ])
  if (tasks.error) throw tasks.error
  if (projects.error) throw projects.error
  if (goals.error) throw goals.error
  const items: CalendarItem[] = [
    ...(tasks.data ?? []).map((row) => ({ id: row.id, date: row.due_at!.slice(0, 10), type: 'task' as const, title: row.title, status: row.status })),
    ...(projects.data ?? []).map((row) => ({ id: row.id, date: row.target_date!, type: 'project' as const, title: row.name, status: row.status })),
    ...(goals.data ?? []).map((row) => ({ id: row.id, date: row.target_date!, type: 'goal' as const, title: row.name, status: row.status })),
  ]
  return items.sort((a, b) => a.date.localeCompare(b.date))
}
