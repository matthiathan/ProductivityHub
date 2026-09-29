import { useEffect, useMemo, useState } from 'react'
import { Archive, Bell, CalendarClock, Check, Plus, Repeat2, Save, Search, Tag as TagIcon, Trash2, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { archiveTask, attachTag, createSubtask, createTask, createTaskReminder, deleteTask, detachTag, generateTaskOccurrences, listProjects, listSubtasks, listTaskTags, listTasks, setSubtaskCompleted, updateTask, updateTaskStatus, type Project, type Subtask, type Tag, type Task, type TaskPriority, type TaskStatus } from '../lib/productivity'
import { filterTasks, type TaskView } from '../lib/taskFilters'
import '../styles/taskAcceptance.css'

const columns: { key: TaskStatus; label: string }[] = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
]

function toDateTimeLocal(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function TasksPage() {
  const { session } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [view, setView] = useState<TaskView>('all')
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [tags, setTags] = useState<Tag[]>([])

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const [taskRows, projectRows] = await Promise.all([listTasks(), listProjects()])
      setTasks(taskRows)
      setProjects(projectRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load tasks.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  useEffect(() => {
    const createRequested = searchParams.get('create') === '1'
    const openId = searchParams.get('open')
    if (createRequested) setShowForm(true)
    if (openId && tasks.length) {
      const match = tasks.find(task => task.id === openId)
      if (match) void openTask(match)
    }
    if (createRequested || openId) {
      const next = new URLSearchParams(searchParams)
      next.delete('create')
      next.delete('open')
      setSearchParams(next, { replace: true })
    }
  }, [tasks, searchParams, setSearchParams])

  const visibleTasks = useMemo(() => {
    const query = search.trim().toLowerCase()
    return filterTasks(tasks, view).filter(task => {
      const matchesSearch = !query || task.title.toLowerCase().includes(query) || (task.description ?? '').toLowerCase().includes(query) || (task.projects?.name ?? '').toLowerCase().includes(query)
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
      const matchesProject = projectFilter === 'all' || (projectFilter === 'none' ? !task.project_id : task.project_id === projectFilter)
      return matchesSearch && matchesPriority && matchesProject
    })
  }, [tasks, view, search, priorityFilter, projectFilter])

  const counts = useMemo(() => Object.fromEntries(columns.map(({ key }) => [key, visibleTasks.filter(task => task.status === key).length])), [visibleTasks])

  async function openTask(task: Task) {
    setSelectedTask(task)
    setError('')
    try {
      const [subtaskRows, tagRows] = await Promise.all([listSubtasks(task.id), listTaskTags(task.id)])
      setSubtasks(subtaskRows)
      setTags(tagRows)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load task details.') }
  }

  async function saveTask(form: HTMLFormElement) {
    if (!selectedTask) return
    const data = new FormData(form)
    const dueValue = String(data.get('due_at') || '')
    try {
      const updated = await updateTask(selectedTask.id, {
        title: String(data.get('title') || '').trim(),
        description: String(data.get('description') || '').trim() || null,
        priority: String(data.get('priority') || 'medium') as TaskPriority,
        project_id: String(data.get('project_id') || '') || null,
        due_at: dueValue ? new Date(dueValue).toISOString() : null,
        estimate_minutes: String(data.get('estimate_minutes') || '') ? Number(data.get('estimate_minutes')) : null,
        notes: String(data.get('notes') || '').trim() || null,
      })
      setTasks(current => current.map(item => item.id === updated.id ? updated : item))
      setSelectedTask(updated)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update task.') }
  }

  async function addSubtask(title: string) {
    if (!selectedTask || !session?.user.id || !title.trim()) return
    try {
      const subtask = await createSubtask(session.user.id, selectedTask.id, title.trim())
      setSubtasks(current => [...current, subtask])
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not add subtask.') }
  }

  async function toggleSubtask(subtask: Subtask) {
    try {
      const updated = await setSubtaskCompleted(subtask.id, !subtask.is_completed)
      setSubtasks(current => current.map(item => item.id === updated.id ? updated : item))
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update subtask.') }
  }

  async function addTag(name: string) {
    if (!selectedTask || !session?.user.id || !name.trim()) return
    try {
      const tag = await attachTag(session.user.id, selectedTask.id, name)
      setTags(current => current.some(item => item.id === tag.id) ? current : [...current, tag])
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not add tag.') }
  }

  async function removeTag(tag: Tag) {
    if (!selectedTask) return
    try {
      await detachTag(selectedTask.id, tag.id)
      setTags(current => current.filter(item => item.id !== tag.id))
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not remove tag.') }
  }

  async function archiveSelectedTask() {
    if (!selectedTask) return
    try {
      await archiveTask(selectedTask.id)
      setTasks(current => current.map(item => item.id === selectedTask.id ? { ...item, archived_at: new Date().toISOString() } : item))
      setSelectedTask(null)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not archive task.') }
  }

  async function deleteSelectedTask() {
    if (!selectedTask || !window.confirm(`Delete “${selectedTask.title}” permanently?`)) return
    try {
      await deleteTask(selectedTask.id)
      setTasks(current => current.filter(item => item.id !== selectedTask.id))
      setSelectedTask(null)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not delete task.') }
  }

  async function addReminder(remindAt: string, message: string) {
    if (!selectedTask || !session?.user.id || !remindAt) return
    try {
      await createTaskReminder(session.user.id, selectedTask.id, new Date(remindAt).toISOString(), message.trim() || null)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not create reminder.') }
  }

  async function moveTask(task: Task, status: TaskStatus) {
    const previous = tasks
    setTasks(current => current.map(item => item.id === task.id ? { ...item, status } : item))
    try {
      const updated = await updateTaskStatus(task.id, status)
      setTasks(current => current.map(item => item.id === task.id ? updated : item))
      if (selectedTask?.id === updated.id) setSelectedTask(updated)
    } catch (err) {
      setTasks(previous)
      setError(err instanceof Error ? err.message : 'Could not update task.')
    }
  }

  async function handleCreate(form: HTMLFormElement) {
    if (!session?.user.id) return
    const data = new FormData(form)
    const recurrence = String(data.get('recurrence') || 'none')
    const recurrenceInterval = Math.max(1, Number(data.get('recurrence_interval') || 1))
    const dueValue = String(data.get('due_at') || '')
    if (recurrence !== 'none' && !dueValue) {
      setError('Recurring tasks need a first due date/time.')
      return
    }
    const rule = recurrence === 'none' ? null : { frequency: recurrence, interval: recurrenceInterval }
    try {
      const created = await createTask({
        user_id: session.user.id,
        title: String(data.get('title') || '').trim(),
        description: String(data.get('description') || '').trim() || null,
        priority: String(data.get('priority') || 'medium') as TaskPriority,
        project_id: String(data.get('project_id') || '') || null,
        due_at: dueValue ? new Date(dueValue).toISOString() : null,
        estimate_minutes: String(data.get('estimate_minutes') || '') ? Number(data.get('estimate_minutes')) : null,
        is_recurring: Boolean(rule),
        recurrence_rule: rule,
        recurrence_timezone: rule ? Intl.DateTimeFormat().resolvedOptions().timeZone : null,
      })
      if (created.is_recurring) {
        await generateTaskOccurrences(created.id)
        setTasks(await listTasks())
      } else {
        setTasks(current => [created, ...current])
      }
      setShowForm(false)
      form.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create task.')
    }
  }

  return <>
    <div className="page-heading">
      <div><div className="eyebrow">WORKFLOW</div><h1>My Tasks</h1><p className="muted">Move work through the five-stage workflow and keep every transition measurable.</p></div>
      <button className="primary-button" onClick={() => setShowForm(true)}><Plus size={17}/> New task</button>
    </div>

    {error && <div className="error-banner">{error}</div>}
    <div className="task-view-tabs">{(['all','today','upcoming','overdue','completed'] as TaskView[]).map(item => <button key={item} className={view===item?'active':''} onClick={() => setView(item)}>{item[0].toUpperCase()+item.slice(1)}</button>)}</div>
    <div className="task-filter-bar">
      <label className="task-search"><Search size={16}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search tasks, descriptions or projects…"/></label>
      <select value={priorityFilter} onChange={event => setPriorityFilter(event.target.value as 'all' | TaskPriority)}><option value="all">All priorities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
      <select value={projectFilter} onChange={event => setProjectFilter(event.target.value)}><option value="all">All projects</option><option value="none">No project</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
      <span className="filter-result-count">{visibleTasks.length} task{visibleTasks.length === 1 ? '' : 's'}</span>
    </div>

    {showForm && <div className="panel create-panel">
      <div className="panel-header"><div><h2>Create task</h2><p>Recurring tasks remain templates so each occurrence can be tracked separately.</p></div><button className="icon-button" onClick={() => setShowForm(false)}><X size={18}/></button></div>
      <form className="task-form" onSubmit={(event) => { event.preventDefault(); void handleCreate(event.currentTarget) }}>
        <label>Title<input name="title" required autoFocus /></label>
        <label>Priority<select name="priority" defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
        <label>Project<select name="project_id" defaultValue=""><option value="">No project</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <label>Due date<input type="datetime-local" name="due_at" /></label>
        <label>Estimate (minutes)<input type="number" min="0" name="estimate_minutes" /></label>
        <label>Recurrence<select name="recurrence" defaultValue="none"><option value="none">Not recurring</option><option value="daily">Days</option><option value="weekly">Weeks</option><option value="monthly">Months</option></select></label><label>Repeat every<input type="number" min="1" defaultValue="1" name="recurrence_interval"/><span className="field-help">Use 2 + Weeks for every 2 weeks, etc.</span></label>
        <label className="form-span">Description<textarea name="description" rows={3}/></label>
        <div className="form-span form-actions"><button className="primary-button" type="submit">Create task</button><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button></div>
      </form>
    </div>}

    {loading ? <div className="panel empty-state">Loading tasks…</div> : <div className="kanban-board">
      {columns.map(column => <section className="kanban-column" key={column.key}>
        <div className="kanban-header"><span>{column.label}</span><strong>{counts[column.key] ?? 0}</strong></div>
        <div className="kanban-stack">
          {visibleTasks.filter(task => task.status === column.key).map(task => <article className="task-card" key={task.id}>
            <div className="task-card-top"><span className={`priority priority-${task.priority}`}>{task.priority}</span>{task.is_recurring && <Repeat2 size={15} className="accent-icon"/>}</div>
            <h3>{task.title}</h3>
            {task.description && <p>{task.description}</p>}
            <div className="task-meta">{task.projects?.name && <span>{task.projects.name}</span>}{task.due_at && <span><CalendarClock size={13}/>{new Date(task.due_at).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</span>}</div>
            <div className="task-card-actions"><select aria-label={`Move ${task.title}`} value={task.status} onChange={event => void moveTask(task, event.target.value as TaskStatus)}>{columns.map(option => <option value={option.key} key={option.key}>{option.label}</option>)}</select><button className="secondary-button compact-button" onClick={() => void openTask(task)}>Details</button></div>
          </article>)}
          {visibleTasks.every(task => task.status !== column.key) && <div className="column-empty">No tasks</div>}
        </div>
      </section>)}
    </div>}

    {selectedTask && <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedTask(null) }}><aside className="task-drawer">
      <div className="drawer-header"><div><span className={`priority priority-${selectedTask.priority}`}>{selectedTask.priority}</span><h2>{selectedTask.title}</h2></div><button className="icon-button" onClick={() => setSelectedTask(null)}><X size={18}/></button></div>
      <section className="drawer-section"><h3>Edit task</h3><form className="task-edit-form" onSubmit={(event) => { event.preventDefault(); void saveTask(event.currentTarget) }}>
        <label>Title<input name="title" defaultValue={selectedTask.title} required/></label>
        <label>Priority<select name="priority" defaultValue={selectedTask.priority}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
        <label>Project<select name="project_id" defaultValue={selectedTask.project_id ?? ''}><option value="">No project</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <label>Due date<input name="due_at" type="datetime-local" defaultValue={toDateTimeLocal(selectedTask.due_at)}/></label>
        <label>Estimate (minutes)<input name="estimate_minutes" type="number" min="0" defaultValue={selectedTask.estimate_minutes ?? ''}/></label>
        <label className="form-span">Description<textarea name="description" rows={3} defaultValue={selectedTask.description ?? ''}/></label>
        <label className="form-span">Notes<textarea name="notes" rows={3} defaultValue={selectedTask.notes ?? ''}/></label>
        <button className="primary-button form-span" type="submit"><Save size={15}/> Save changes</button>
      </form></section>
      <section className="drawer-section"><h3>Checklist</h3><div className="subtask-list">{subtasks.map(subtask => <button className={subtask.is_completed ? 'subtask completed' : 'subtask'} key={subtask.id} onClick={() => void toggleSubtask(subtask)}><span className="subtask-check">{subtask.is_completed && <Check size={12}/>}</span><span>{subtask.title}</span></button>)}</div><form className="inline-form" onSubmit={(event) => { event.preventDefault(); const input=event.currentTarget.elements.namedItem('subtask') as HTMLInputElement; void addSubtask(input.value).then(() => { input.value='' }) }}><input name="subtask" placeholder="Add checklist item…"/><button className="secondary-button">Add</button></form></section>
      <section className="drawer-section"><h3><TagIcon size={15}/> Tags</h3><div className="tag-list">{tags.map(tag => <button className="tag-chip" key={tag.id} onClick={() => void removeTag(tag)}>{tag.name}<X size={12}/></button>)}</div><form className="inline-form" onSubmit={(event) => { event.preventDefault(); const input=event.currentTarget.elements.namedItem('tag') as HTMLInputElement; void addTag(input.value).then(() => { input.value='' }) }}><input name="tag" placeholder="Add tag…"/><button className="secondary-button">Add</button></form></section>
      <section className="drawer-section"><h3><Bell size={15}/> Reminder</h3><form className="reminder-form" onSubmit={(event) => { event.preventDefault(); const when=(event.currentTarget.elements.namedItem('remind_at') as HTMLInputElement); const msg=(event.currentTarget.elements.namedItem('message') as HTMLInputElement); void addReminder(when.value,msg.value).then(() => { when.value=''; msg.value='' }) }}><input name="remind_at" type="datetime-local" required/><input name="message" placeholder="Optional reminder message"/><button className="secondary-button">Set reminder</button></form></section>
      <section className="drawer-section detail-grid"><div><span>Status</span><strong>{columns.find(c => c.key===selectedTask.status)?.label}</strong></div><div><span>Actual time</span><strong>{selectedTask.actual_minutes ? `${selectedTask.actual_minutes} min` : '—'}</strong></div><div><span>Created</span><strong>{new Date(selectedTask.created_at).toLocaleDateString()}</strong></div><div><span>Completed</span><strong>{selectedTask.completed_at ? new Date(selectedTask.completed_at).toLocaleString() : '—'}</strong></div></section>
      <section className="drawer-section destructive-actions"><button className="secondary-button" onClick={() => void archiveSelectedTask()}><Archive size={15}/> Archive</button><button className="text-button danger" onClick={() => void deleteSelectedTask()}><Trash2 size={15}/> Delete permanently</button></section>
    </aside></div>}
  </>
}
