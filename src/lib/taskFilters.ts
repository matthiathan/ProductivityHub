export type TaskView = 'all' | 'today' | 'upcoming' | 'overdue' | 'completed'

type FilterableTask = {
  status: string
  due_at: string | null
  archived_at?: string | null
}

function localDateKey(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function filterTasks<T extends FilterableTask>(tasks: T[], view: TaskView, now = new Date()) {
  const visible = tasks.filter((task) => !task.archived_at)
  if (view === 'all') return visible
  if (view === 'completed') return visible.filter((task) => task.status === 'done')

  const today = localDateKey(now)
  return visible.filter((task) => {
    if (task.status === 'done' || !task.due_at) return false
    const due = new Date(task.due_at)
    if (view === 'today') return localDateKey(due) === today
    if (view === 'overdue') return due.getTime() < now.getTime()
    if (view === 'upcoming') return due.getTime() >= now.getTime() && localDateKey(due) !== today
    return true
  })
}
