import { Clock3, Play, Square, TimerReset } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { listProjects, listTasks, type Project, type Task } from '../lib/productivity'
import {
  addManualTimeEntry,
  getActiveFocusSession,
  getUserSettings,
  listFocusSessions,
  listTimeEntries,
  startFocusSession,
  stopFocusSession,
  type FocusCategory,
  type FocusSession,
  type TimeEntry,
  type UserSettings,
} from '../lib/tracking'

const categories: Array<{ value: FocusCategory; label: string }> = [
  { value: 'deep_work', label: 'Deep Work' },
  { value: 'planning', label: 'Planning' },
  { value: 'admin', label: 'Admin' },
  { value: 'learning', label: 'Learning' },
  { value: 'other', label: 'Other' },
]

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours ? `${hours}h ${mins}m` : `${mins}m`
}

function elapsedLabel(startedAt: string, now: number) {
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export function FocusPage() {
  const { session } = useAuth()
  const [active, setActive] = useState<FocusSession | null>(null)
  const [sessions, setSessions] = useState<FocusSession[]>([])
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [now, setNow] = useState(Date.now())
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [sessionForm, setSessionForm] = useState({ title: '', category: 'deep_work' as FocusCategory, task_id: '', project_id: '' })
  const [manualForm, setManualForm] = useState({ duration: '30', category: 'deep_work' as FocusCategory, task_id: '', project_id: '', description: '', entry_date: new Date().toISOString().slice(0, 10) })

  async function reload() {
    if (!session?.user.id) return
    try {
      const [activeSession, recentSessions, recentEntries, taskRows, projectRows, userSettings] = await Promise.all([
        getActiveFocusSession(), listFocusSessions(), listTimeEntries(), listTasks(), listProjects(), getUserSettings(session.user.id),
      ])
      setActive(activeSession)
      setSessions(recentSessions)
      setEntries(recentEntries)
      setTasks(taskRows)
      setProjects(projectRows)
      setSettings(userSettings)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load time tracking.')
    }
  }

  useEffect(() => { void reload() }, [session?.user.id])
  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [active])

  const weekFocusMinutes = useMemo(() => sessions
    .filter((item) => new Date(item.started_at).getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000)
    .reduce((sum, item) => sum + item.duration_minutes, 0) + entries
      .filter((item) => item.category === 'deep_work' && new Date(`${item.entry_date}T00:00:00`).getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000)
      .reduce((sum, item) => sum + item.duration_minutes, 0), [sessions, entries])

  async function handleStart() {
    if (!session?.user.id || active) return
    setStarting(true)
    try {
      await startFocusSession({
        user_id: session.user.id,
        title: sessionForm.title.trim() || null,
        category: sessionForm.category,
        task_id: sessionForm.task_id || null,
        project_id: sessionForm.project_id || null,
      })
      setSessionForm({ title: '', category: 'deep_work', task_id: '', project_id: '' })
      await reload()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not start session.') }
    finally { setStarting(false) }
  }

  async function handleStop() {
    if (!active) return
    try {
      await stopFocusSession(active.id)
      await reload()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not stop session.') }
  }

  async function handleManualSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!session?.user.id) return
    try {
      await addManualTimeEntry({
        user_id: session.user.id,
        task_id: manualForm.task_id || null,
        project_id: manualForm.project_id || null,
        category: manualForm.category,
        description: manualForm.description.trim() || null,
        entry_date: manualForm.entry_date,
        duration_minutes: Math.max(1, Number(manualForm.duration)),
      })
      setManualForm((value) => ({ ...value, duration: '30', description: '' }))
      await reload()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not add manual time.') }
  }

  const taskName = (id: string | null) => tasks.find((task) => task.id === id)?.title
  const projectName = (id: string | null) => projects.find((project) => project.id === id)?.name

  return <div>
    <header className="page-heading"><div><p className="eyebrow">TIME TRACKING</p><h1>Focus & Time</h1><p className="muted">Run focused sessions or add time manually when needed.</p></div></header>
    {error && <div className="error-banner">{error}</div>}

    <section className="metric-grid focus-metrics">
      <article className="metric-card"><div className="metric-icon"><Clock3/></div><div><span>This week</span><strong>{formatMinutes(weekFocusMinutes)}</strong><small>Deep-work progress</small></div></article>
      <article className="metric-card"><div className="metric-icon"><TimerReset/></div><div><span>Weekly target</span><strong>{formatMinutes(settings?.weekly_focus_target_minutes ?? 1800)}</strong><small>{Math.min(100, Math.round((weekFocusMinutes / (settings?.weekly_focus_target_minutes ?? 1800)) * 100))}% complete</small></div></article>
    </section>

    <section className="dashboard-grid focus-layout">
      <article className="panel">
        <div className="panel-header"><div><h2>Focus Timer</h2><p>{active ? 'Session currently running' : 'Start a task-linked or general focus session'}</p></div></div>
        {active ? <div className="timer-running">
          <div className="timer-clock">{elapsedLabel(active.started_at, now)}</div>
          <strong>{active.title || categories.find((item) => item.value === active.category)?.label}</strong>
          <p className="muted">{taskName(active.task_id) || projectName(active.project_id) || 'General focus session'}</p>
          <button className="secondary-button stop-button" onClick={() => void handleStop()}><Square size={16}/> Stop session</button>
        </div> : <div className="focus-form">
          <label>Session name<input value={sessionForm.title} onChange={(event) => setSessionForm({ ...sessionForm, title: event.target.value })} placeholder="Optional label"/></label>
          <label>Category<select value={sessionForm.category} onChange={(event) => setSessionForm({ ...sessionForm, category: event.target.value as FocusCategory })}>{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label>Task<select value={sessionForm.task_id} onChange={(event) => setSessionForm({ ...sessionForm, task_id: event.target.value })}><option value="">General / no task</option>{tasks.filter((task) => task.status !== 'done').map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
          <label>Project<select value={sessionForm.project_id} onChange={(event) => setSessionForm({ ...sessionForm, project_id: event.target.value })}><option value="">No project</option>{projects.filter((project) => project.status === 'active').map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          <button className="primary-button" disabled={starting} onClick={() => void handleStart()}><Play size={16}/> {starting ? 'Starting…' : 'Start Focus Session'}</button>
        </div>}
      </article>

      <article className="panel">
        <div className="panel-header"><div><h2>Manual Time</h2><p>Add or correct tracked work.</p></div></div>
        <form className="focus-form" onSubmit={handleManualSubmit}>
          <label>Minutes<input type="number" min="1" value={manualForm.duration} onChange={(event) => setManualForm({ ...manualForm, duration: event.target.value })}/></label>
          <label>Date<input type="date" value={manualForm.entry_date} onChange={(event) => setManualForm({ ...manualForm, entry_date: event.target.value })}/></label>
          <label>Category<select value={manualForm.category} onChange={(event) => setManualForm({ ...manualForm, category: event.target.value as FocusCategory })}>{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label>Task<select value={manualForm.task_id} onChange={(event) => setManualForm({ ...manualForm, task_id: event.target.value })}><option value="">No task</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
          <label>Project<select value={manualForm.project_id} onChange={(event) => setManualForm({ ...manualForm, project_id: event.target.value })}><option value="">No project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          <label>Description<textarea rows={3} value={manualForm.description} onChange={(event) => setManualForm({ ...manualForm, description: event.target.value })}/></label>
          <button className="primary-button" type="submit">Add Time Entry</button>
        </form>
      </article>
    </section>

    <section className="panel tracking-history">
      <div className="panel-header"><div><h2>Recent Activity</h2><p>Completed focus sessions and manual entries.</p></div></div>
      <div className="history-list">
        {[...sessions.map((item) => ({ kind: 'Focus', when: item.started_at, minutes: item.duration_minutes, label: item.title || categories.find((c) => c.value === item.category)?.label || item.category, linked: taskName(item.task_id) || projectName(item.project_id) })), ...entries.map((item) => ({ kind: 'Manual', when: `${item.entry_date}T12:00:00`, minutes: item.duration_minutes, label: item.description || categories.find((c) => c.value === item.category)?.label || item.category, linked: taskName(item.task_id) || projectName(item.project_id) }))]
          .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime()).slice(0, 20)
          .map((item, index) => <div className="history-row" key={`${item.kind}-${item.when}-${index}`}><span className="pill">{item.kind}</span><div><strong>{item.label}</strong><small>{item.linked || 'General'}</small></div><span>{formatMinutes(item.minutes)}</span><small>{new Date(item.when).toLocaleDateString()}</small></div>)}
      </div>
    </section>
  </div>
}
