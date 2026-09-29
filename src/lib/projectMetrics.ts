type ProjectMetricTask = {
  status: string
  actual_minutes: number
  archived_at?: string | null
}

export function calculateProjectMetrics(tasks: ProjectMetricTask[]) {
  const visible = tasks.filter((task) => !task.archived_at)
  const completedTasks = visible.filter((task) => task.status === 'done').length
  const totalTasks = visible.length
  return {
    totalTasks,
    completedTasks,
    openTasks: totalTasks - completedTasks,
    progressPercent: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
    trackedMinutes: visible.reduce((sum, task) => sum + Number(task.actual_minutes || 0), 0),
  }
}
