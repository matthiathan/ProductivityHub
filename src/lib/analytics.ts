import { listGoalsWithProgress } from './goals'
import { deriveProductivityComponents } from './productivityMetrics'
import { calculateProductivityScore, DEFAULT_PRODUCTIVITY_WEIGHTS, type ProductivityWeights } from './productivityScore'
import { supabase } from './supabase'
import { getUserSettings } from './tracking'

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

function startOfWeek(now = new Date()) {
  const date = new Date(now)
  const day = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - day)
  date.setHours(0, 0, 0, 0)
  return date
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

export async function getDashboardAnalytics(userId: string) {
  const client = requireClient()
  const now = new Date()
  const weekStart = startOfWeek(now)
  const last7 = new Date(now)
  last7.setDate(last7.getDate() - 6)
  last7.setHours(0, 0, 0, 0)

  const [tasksResult, focusResult, entriesResult, projectsResult, goals, settings] = await Promise.all([
    client.from('tasks').select('id,status,due_at,completed_at,created_at').eq('is_recurring', false),
    client.from('focus_sessions').select('started_at,duration_minutes').not('ended_at', 'is', null).gte('started_at', weekStart.toISOString()),
    client.from('time_entries').select('entry_date,duration_minutes,category').gte('entry_date', isoDate(weekStart)),
    client.from('projects').select('id,status').eq('status', 'active'),
    listGoalsWithProgress(),
    getUserSettings(userId),
  ])

  if (tasksResult.error) throw tasksResult.error
  if (focusResult.error) throw focusResult.error
  if (entriesResult.error) throw entriesResult.error
  if (projectsResult.error) throw projectsResult.error

  const tasks = tasksResult.data ?? []
  const completed = tasks.filter((task) => task.status === 'done')
  const open = tasks.filter((task) => task.status !== 'done')
  const overdue = open.filter((task) => task.due_at && new Date(task.due_at).getTime() < now.getTime())
  const completedDue = completed.filter((task) => task.due_at && task.completed_at)
  const onTime = completedDue.filter((task) => new Date(task.completed_at!).getTime() <= new Date(task.due_at!).getTime())

  const focusMinutes = (focusResult.data ?? []).reduce((sum, row) => sum + Number(row.duration_minutes ?? 0), 0)
  const manualDeepWorkMinutes = (entriesResult.data ?? []).filter((entry) => entry.category === 'deep_work').reduce((sum, row) => sum + Number(row.duration_minutes ?? 0), 0)
  const weeklyFocusMinutes = focusMinutes + manualDeepWorkMinutes

  const activeDates = new Set<string>()
  for (const row of focusResult.data ?? []) {
    if (new Date(row.started_at).getTime() >= last7.getTime()) activeDates.add(row.started_at.slice(0, 10))
  }
  for (const row of entriesResult.data ?? []) {
    if (new Date(`${row.entry_date}T00:00:00`).getTime() >= last7.getTime()) activeDates.add(row.entry_date)
  }
  for (const task of completed) {
    if (task.completed_at && new Date(task.completed_at).getTime() >= last7.getTime()) activeDates.add(task.completed_at.slice(0, 10))
  }

  const activeGoals = goals.filter((goal) => goal.status === 'active')
  const components = deriveProductivityComponents({
    totalTasks: tasks.length,
    completedTasks: completed.length,
    weeklyFocusMinutes,
    weeklyFocusTargetMinutes: settings.weekly_focus_target_minutes,
    completedDueTasks: completedDue.length,
    completedDueTasksOnTime: onTime.length,
    activeGoalPercentages: activeGoals.map((goal) => goal.progress_percent),
    activeDaysLast7: activeDates.size,
    openTasks: open.length,
    overdueTasks: overdue.length,
  })

  const weights = { ...DEFAULT_PRODUCTIVITY_WEIGHTS, ...(settings.productivity_weights ?? {}) } as ProductivityWeights
  const scoreResult = calculateProductivityScore(components, weights)

  const snapshot = {
    user_id: userId,
    snapshot_date: isoDate(now),
    score: scoreResult.score,
    task_completion: components.taskCompletion,
    focus_time: components.focusTime,
    deadline_performance: components.deadlinePerformance,
    goal_progress: components.goalProgress,
    consistency: components.consistency,
    workload_control: components.workloadControl,
    focus_minutes: weeklyFocusMinutes,
    tasks_completed: completed.length,
    overdue_tasks: overdue.length,
  }
  const saved = await client.from('productivity_snapshots').upsert(snapshot, { onConflict: 'user_id,snapshot_date' })
  if (saved.error) throw saved.error

  const historyResult = await client
    .from('productivity_snapshots')
    .select('snapshot_date,score,focus_minutes')
    .order('snapshot_date', { ascending: true })
    .limit(30)
  if (historyResult.error) throw historyResult.error

  return {
    score: scoreResult.score,
    components,
    weeklyFocusMinutes,
    weeklyFocusTargetMinutes: settings.weekly_focus_target_minutes,
    completedTasks: completed.length,
    openTasks: open.length,
    overdueTasks: overdue.length,
    activeProjects: (projectsResult.data ?? []).length,
    goals: activeGoals,
    history: historyResult.data ?? [],
  }
}
