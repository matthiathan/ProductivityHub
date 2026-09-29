import { supabase } from './supabase'
import type { Project } from './productivity'

export type GoalType = 'numeric' | 'task_based' | 'project_milestone'
export type GoalMetric = 'focus_minutes' | 'tasks_completed' | 'manual_value' | null
export type GoalStatus = 'active' | 'completed' | 'archived'

export type Goal = {
  id: string
  user_id: string
  project_id: string | null
  name: string
  description: string | null
  goal_type: GoalType
  metric: GoalMetric
  target_value: number | null
  unit: string | null
  start_date: string
  target_date: string | null
  status: GoalStatus
  completed_at: string | null
  created_at: string
  updated_at: string
  projects?: Pick<Project, 'id' | 'name' | 'status'> | null
}

export type GoalWithProgress = Goal & {
  current_value: number
  progress_percent: number
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

function endOfDate(date: string) {
  return `${date}T23:59:59.999Z`
}

export async function listGoals() {
  const client = requireClient()
  const { data, error } = await client
    .from('goals')
    .select('*, projects(id,name,status)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Goal[]
}

export async function createGoal(input: {
  user_id: string
  name: string
  description?: string | null
  goal_type: GoalType
  metric?: GoalMetric
  target_value?: number | null
  unit?: string | null
  project_id?: string | null
  start_date?: string
  target_date?: string | null
}) {
  const client = requireClient()
  const { data, error } = await client.from('goals').insert(input).select('*, projects(id,name,status)').single()
  if (error) throw error
  return data as Goal
}

export async function updateGoal(id: string, changes: Partial<Pick<Goal, 'name' | 'description' | 'target_value' | 'unit' | 'project_id' | 'start_date' | 'target_date' | 'status'>>) {
  const client = requireClient()
  const patch: Record<string, unknown> = { ...changes }
  if (changes.status === 'completed') patch.completed_at = new Date().toISOString()
  if (changes.status && changes.status !== 'completed') patch.completed_at = null
  const { data, error } = await client.from('goals').update(patch).eq('id', id).select('*, projects(id,name,status)').single()
  if (error) throw error
  return data as Goal
}

export async function deleteGoal(id: string) {
  const { error } = await requireClient().from('goals').delete().eq('id', id)
  if (error) throw error
}

export async function recordGoalProgress(userId: string, goalId: string, value: number, note?: string | null) {
  const client = requireClient()
  const { error } = await client.from('goal_progress').insert({ user_id: userId, goal_id: goalId, value, note })
  if (error) throw error
}

export async function setGoalStatus(goalId: string, status: GoalStatus) {
  return updateGoal(goalId, { status })
}

export async function getGoalProgress(goal: Goal): Promise<GoalWithProgress> {
  const client = requireClient()
  let current = 0

  if (goal.goal_type === 'project_milestone') {
    current = goal.projects?.status === 'completed' ? 1 : 0
  } else if (goal.metric === 'manual_value') {
    const { data, error } = await client.from('goal_progress').select('value').eq('goal_id', goal.id).gte('recorded_at', `${goal.start_date}T00:00:00Z`)
    if (error) throw error
    current = (data ?? []).reduce((sum, row) => sum + Number(row.value ?? 0), 0)
  } else if (goal.metric === 'focus_minutes') {
    let sessionQuery = client.from('focus_sessions').select('duration_minutes').not('ended_at', 'is', null).gte('started_at', `${goal.start_date}T00:00:00Z`)
    let manualQuery = client.from('time_entries').select('duration_minutes').gte('entry_date', goal.start_date)
    if (goal.target_date) {
      sessionQuery = sessionQuery.lte('started_at', endOfDate(goal.target_date))
      manualQuery = manualQuery.lte('entry_date', goal.target_date)
    }
    const [sessions, entries] = await Promise.all([sessionQuery, manualQuery])
    if (sessions.error) throw sessions.error
    if (entries.error) throw entries.error
    current = [...(sessions.data ?? []), ...(entries.data ?? [])].reduce((sum, row) => sum + Number(row.duration_minutes ?? 0), 0)
  } else if (goal.metric === 'tasks_completed' || goal.goal_type === 'task_based') {
    let query = client.from('tasks').select('id', { count: 'exact', head: true }).eq('is_recurring', false).eq('status', 'done').is('archived_at', null).gte('completed_at', `${goal.start_date}T00:00:00Z`)
    if (goal.target_date) query = query.lte('completed_at', endOfDate(goal.target_date))
    const { count, error } = await query
    if (error) throw error
    current = count ?? 0
  }

  const target = goal.goal_type === 'project_milestone' ? 1 : Number(goal.target_value ?? 0)
  const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  return { ...goal, current_value: current, progress_percent: progress }
}

export async function listGoalsWithProgress() {
  const goals = await listGoals()
  const rows = await Promise.all(goals.map(getGoalProgress))
  const completedAutomatically = await Promise.all(rows.map(async (goal) => {
    if (goal.status === 'active' && goal.progress_percent >= 100) {
      const updated = await setGoalStatus(goal.id, 'completed')
      return { ...goal, ...updated, status: 'completed' as const, completed_at: updated.completed_at }
    }
    return goal
  }))
  return completedAutomatically
}
