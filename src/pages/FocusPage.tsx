import { Clock3, Edit3, Play, Square, TimerReset, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { listProjects, listTasks, type Project, type Task } from '../lib/productivity'
import {
  addManualTimeEntry,
  deleteFocusSession,
  deleteManualTimeEntry,
  getActiveFocusSession,
  getUserSettings,
  listFocusSessions,
  listTimeEntries,
  startFocusSession,
  stopFocusSession,
  updateFocusSession,
  updateManualTimeEntry,
  type FocusCategory,
  type FocusSession,
  type TimeEntry,
  type UserSettings,
} from '../lib/tracking'
import '../styles/goalsTracking.css'

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
  const [selectedHistory, setSelectedHistory] = useState<{ kind:'focus'; item:FocusSession } | { kind:'manual'; item:TimeEntry } | null>(null)
  const [historyFilter, setHistoryFilter] = useState<'all'|'focus'|'manual'>('all')
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

  const weekFocusMinutes = useMemo(() => {
    const threshold = Date.now() - 7 * 24 * 60 * 60 * 1000
    return sessions.filter(item => new Date(item.started_at).getTime() >= threshold).reduce((sum,item)=>sum+item.duration_minutes,0)
      + entries.filter(item => new Date(`${item.entry_date}T00:00:00`).getTime() >= threshold).reduce((sum,item)=>sum+item.duration_minutes,0)
  }, [sessions, entries])

  const taskName = (id: string | null) => tasks.find((task) => task.id === id)?.title
  const projectName = (id: string | null) => projects.find((project) => project.id === id)?.name

  const history = useMemo(() => [
    ...sessions.map(item => ({ kind:'focus' as const, item, when:item.started_at, minutes:item.duration_minutes, label:item.title || categories.find(c=>c.value===item.category)?.label || item.category, linked:taskName(item.task_id)||projectName(item.project_id) })),
    ...entries.map(item => ({ kind:'manual' as const, item, when:`${item.entry_date}T12:00:00`, minutes:item.duration_minutes, label:item.description || categories.find(c=>c.value===item.category)?.label || item.category, linked:taskName(item.task_id)||projectName(item.project_id) })),
  ].filter(row => historyFilter==='all' || row.kind===historyFilter).sort((a,b)=>new Date(b.when).getTime()-new Date(a.when).getTime()), [sessions,entries,tasks,projects,historyFilter])

  async function handleStart() {
    if (!session?.user.id || active) return
    setStarting(true)
    try {
      await startFocusSession({ user_id: session.user.id, title: sessionForm.title.trim() || null, category: sessionForm.category, task_id: sessionForm.task_id || null, project_id: sessionForm.project_id || null })
      setSessionForm({ title: '', category: 'deep_work', task_id: '', project_id: '' })
      await reload()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not start session.') }
    finally { setStarting(false) }
  }

  async function handleStop() {
    if (!active) return
    try { await stopFocusSession(active.id); await reload() }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not stop session.') }
  }

  async function handleManualSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!session?.user.id) return
    try {
      await addManualTimeEntry({ user_id: session.user.id, task_id: manualForm.task_id || null, project_id: manualForm.project_id || null, category: manualForm.category, description: manualForm.description.trim() || null, entry_date: manualForm.entry_date, duration_minutes: Math.max(1, Number(manualForm.duration)) })
      setManualForm(value => ({ ...value, duration: '30', description: '' }))
      await reload()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not add manual time.') }
  }

  async function saveHistory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedHistory) return
    const data = new FormData(event.currentTarget)
    try {
      if (selectedHistory.kind === 'focus') {
        await updateFocusSession(selectedHistory.item.id, { duration_minutes:Number(data.get('duration')||selectedHistory.item.duration_minutes), title:String(data.get('description')||'').trim()||null, category:String(data.get('category')) as FocusCategory, task_id:String(data.get('task_id')||'')||null, project_id:String(data.get('project_id')||'')||null })
      } else {
        await updateManualTimeEntry(selectedHistory.item.id, { duration_minutes:Number(data.get('duration')||selectedHistory.item.duration_minutes), description:String(data.get('description')||'').trim()||null, category:String(data.get('category')) as FocusCategory, task_id:String(data.get('task_id')||'')||null, project_id:String(data.get('project_id')||'')||null, entry_date:String(data.get('entry_date')||selectedHistory.item.entry_date) })
      }
      setSelectedHistory(null)
      await reload()
    } catch(err){ setError(err instanceof Error?err.message:'Could not update time entry.') }
  }

  async function removeHistory() {
    if (!selectedHistory || !window.confirm('Delete this tracked time permanently?')) return
    try {
      if (selectedHistory.kind==='focus') await deleteFocusSession(selectedHistory.item.id)
      else await deleteManualTimeEntry(selectedHistory.item.id)
      setSelectedHistory(null)
      await reload()
    } catch(err){ setError(err instanceof Error?err.message:'Could not delete time entry.') }
  }

  return <div>
    <header className="page-heading"><div><p className="eyebrow">TIME TRACKING</p><h1>Focus & Time</h1><p className="muted">Run focused sessions or add time manually when needed.</p></div></header>
    {error && <div className="error-banner">{error}</div>}

    <section className="metric-grid focus-metrics">
      <article className="metric-card"><div className="metric-icon"><Clock3/></div><div><span>This week</span><strong>{formatMinutes(weekFocusMinutes)}</strong><small>All tracked focus/work time</small></div></article>
      <article className="metric-card"><div className="metric-icon"><TimerReset/></div><div><span>Weekly target</span><strong>{formatMinutes(settings?.weekly_focus_target_minutes ?? 1800)}</strong><small>{Math.min(100, Math.round((weekFocusMinutes / (settings?.weekly_focus_target_minutes ?? 1800)) * 100))}% complete</small></div></article>
    </section>

    <section className="dashboard-grid focus-layout">
      <article className="panel"><div className="panel-header"><div><h2>Focus Timer</h2><p>{active ? 'Session currently running' : 'Start a task-linked or general focus session'}</p></div></div>
        {active ? <div className="timer-running"><div className="timer-clock">{elapsedLabel(active.started_at, now)}</div><strong>{active.title || categories.find(item => item.value === active.category)?.label}</strong><p className="muted">{taskName(active.task_id) || projectName(active.project_id) || 'General focus session'}</p><button className="secondary-button stop-button" onClick={() => void handleStop()}><Square size={16}/> Stop session</button></div>
        : <div className="focus-form"><label>Session name<input value={sessionForm.title} onChange={event => setSessionForm({ ...sessionForm, title: event.target.value })} placeholder="Optional label"/></label><label>Category<select value={sessionForm.category} onChange={event => setSessionForm({ ...sessionForm, category: event.target.value as FocusCategory })}>{categories.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Task<select value={sessionForm.task_id} onChange={event => setSessionForm({ ...sessionForm, task_id: event.target.value })}><option value="">General / no task</option>{tasks.filter(task => task.status !== 'done').map(task => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label><label>Project<select value={sessionForm.project_id} onChange={event => setSessionForm({ ...sessionForm, project_id: event.target.value })}><option value="">No project</option>{projects.filter(project => project.status === 'active').map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><button className="primary-button" disabled={starting} onClick={() => void handleStart()}><Play size={16}/> {starting ? 'Starting…' : 'Start Focus Session'}</button></div>}
      </article>

      <article className="panel"><div className="panel-header"><div><h2>Manual Time</h2><p>Add or correct tracked work.</p></div></div><form className="focus-form" onSubmit={handleManualSubmit}><label>Minutes<input type="number" min="1" value={manualForm.duration} onChange={event => setManualForm({ ...manualForm, duration: event.target.value })}/></label><label>Date<input type="date" value={manualForm.entry_date} onChange={event => setManualForm({ ...manualForm, entry_date: event.target.value })}/></label><label>Category<select value={manualForm.category} onChange={event => setManualForm({ ...manualForm, category: event.target.value as FocusCategory })}>{categories.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Task<select value={manualForm.task_id} onChange={event => setManualForm({ ...manualForm, task_id: event.target.value })}><option value="">No task</option>{tasks.map(task => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label><label>Project<select value={manualForm.project_id} onChange={event => setManualForm({ ...manualForm, project_id: event.target.value })}><option value="">No project</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><label>Description<textarea rows={3} value={manualForm.description} onChange={event => setManualForm({ ...manualForm, description: event.target.value })}/></label><button className="primary-button" type="submit">Add Time Entry</button></form></article>
    </section>

    <section className="panel tracking-history"><div className="panel-header"><div><h2>Recent Activity</h2><p>Completed focus sessions and manual entries. Select any row to correct it.</p></div><div className="toolbar-group">{(['all','focus','manual'] as const).map(filter => <button className={`toolbar-pill ${historyFilter===filter?'active':''}`} onClick={() => setHistoryFilter(filter)} key={filter}>{filter}</button>)}</div></div><div className="history-list">{history.slice(0,40).map(row => <button className="history-row history-row-button" key={`${row.kind}-${row.item.id}`} onClick={() => setSelectedHistory(row.kind==='focus'?{kind:'focus',item:row.item}:{kind:'manual',item:row.item})}><span className="pill">{row.kind==='focus'?'Focus':'Manual'}</span><div><strong>{row.label}</strong><small>{row.linked || 'General'}</small></div><span>{formatMinutes(row.minutes)}</span><small>{new Date(row.when).toLocaleDateString()}</small><Edit3 size={14}/></button>)}</div></section>

    {selectedHistory && <div className="drawer-backdrop" onMouseDown={event => { if(event.target===event.currentTarget)setSelectedHistory(null) }}><aside className="task-drawer"><div className="drawer-header"><div><span className="pill">{selectedHistory.kind==='focus'?'Focus session':'Manual entry'}</span><h2>Edit tracked time</h2></div><button className="icon-button" onClick={() => setSelectedHistory(null)}><X size={18}/></button></div><form className="focus-form" onSubmit={saveHistory}><label>Minutes<input name="duration" type="number" min="1" defaultValue={selectedHistory.item.duration_minutes}/></label>{selectedHistory.kind==='manual' && <label>Date<input name="entry_date" type="date" defaultValue={selectedHistory.item.entry_date}/></label>}<label>Category<select name="category" defaultValue={selectedHistory.item.category}>{categories.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label><label>Task<select name="task_id" defaultValue={selectedHistory.item.task_id ?? ''}><option value="">No task</option>{tasks.map(task => <option value={task.id} key={task.id}>{task.title}</option>)}</select></label><label>Project<select name="project_id" defaultValue={selectedHistory.item.project_id ?? ''}><option value="">No project</option>{projects.map(project => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label><label>Description<input name="description" defaultValue={selectedHistory.kind==='focus'?(selectedHistory.item.title ?? ''):(selectedHistory.item.description ?? '')}/></label><button className="primary-button" type="submit">Save correction</button></form><section className="drawer-section destructive-actions"><span className="muted">Task actual time is recalculated automatically.</span><button className="text-button danger" onClick={() => void removeHistory()}><Trash2 size={15}/> Delete</button></section></aside></div>}
  </div>
}
