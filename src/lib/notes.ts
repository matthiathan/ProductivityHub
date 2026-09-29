import { supabase } from './supabase'

export type Note = {
  id: string
  user_id: string
  task_id: string | null
  project_id: string | null
  title: string
  content: string
  pinned: boolean
  created_at: string
  updated_at: string
}

function requireClient() { if (!supabase) throw new Error('Supabase is not configured.'); return supabase }

export async function listNotes() {
  const { data, error } = await requireClient().from('notes').select('*').order('pinned', { ascending: false }).order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Note[]
}

export async function createNote(input: { user_id: string; title: string; content?: string; task_id?: string | null; project_id?: string | null }) {
  const { data, error } = await requireClient().from('notes').insert(input).select('*').single()
  if (error) throw error
  return data as Note
}

export async function updateNote(id: string, changes: Partial<Pick<Note, 'title' | 'content' | 'pinned' | 'task_id' | 'project_id'>>) {
  const { data, error } = await requireClient().from('notes').update(changes).eq('id', id).select('*').single()
  if (error) throw error
  return data as Note
}

export async function deleteNote(id: string) {
  const { error } = await requireClient().from('notes').delete().eq('id', id)
  if (error) throw error
}
