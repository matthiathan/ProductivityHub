import { supabase } from './supabase'
function requireClient() { if (!supabase) throw new Error('Supabase is not configured.'); return supabase }
export async function listProductivitySnapshots(limit = 90) {
  const { data, error } = await requireClient().from('productivity_snapshots').select('*').order('snapshot_date', { ascending: true }).limit(limit)
  if (error) throw error
  return data ?? []
}
