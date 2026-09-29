import { supabase } from './supabase'

export type GlobalSearchResult = {
  id: string
  type: 'task' | 'project' | 'goal' | 'note'
  title: string
  subtitle: string
  route: string
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function globalSearch(rawQuery: string): Promise<GlobalSearchResult[]> {
  const query = rawQuery.trim()
  if (query.length < 2) return []
  const client = requireClient()
  const pattern = `%${query}%`

  const [tasks, projects, goals, notes] = await Promise.all([
    client.from('tasks').select('id,title,description,status,archived_at').eq('is_recurring', false).is('archived_at', null).or(`title.ilike.${pattern},description.ilike.${pattern}`).limit(6),
    client.from('projects').select('id,name,description,status').or(`name.ilike.${pattern},description.ilike.${pattern}`).limit(6),
    client.from('goals').select('id,name,description,status').neq('status', 'archived').or(`name.ilike.${pattern},description.ilike.${pattern}`).limit(6),
    client.from('notes').select('id,title,content').or(`title.ilike.${pattern},content.ilike.${pattern}`).limit(6),
  ])

  for (const response of [tasks, projects, goals, notes]) if (response.error) throw response.error

  return [
    ...(tasks.data ?? []).map(row => ({ id: row.id, type: 'task' as const, title: row.title, subtitle: `Task · ${row.status.replaceAll('_', ' ')}`, route: `/tasks?open=${encodeURIComponent(row.id)}` })),
    ...(projects.data ?? []).map(row => ({ id: row.id, type: 'project' as const, title: row.name, subtitle: `Project · ${row.status.replaceAll('_', ' ')}`, route: `/projects?open=${encodeURIComponent(row.id)}` })),
    ...(goals.data ?? []).map(row => ({ id: row.id, type: 'goal' as const, title: row.name, subtitle: `Goal · ${row.status}`, route: `/goals?open=${encodeURIComponent(row.id)}` })),
    ...(notes.data ?? []).map(row => ({ id: row.id, type: 'note' as const, title: row.title, subtitle: 'Note', route: `/notes?open=${encodeURIComponent(row.id)}` })),
  ].slice(0, 12)
}
