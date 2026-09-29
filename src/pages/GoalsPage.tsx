import { Archive, CheckCircle2, Edit3, Flag, Plus, Search, Target, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createGoal, deleteGoal, listGoalsWithProgress, recordGoalProgress, setGoalStatus, updateGoal, type GoalStatus, type GoalType, type GoalWithProgress } from '../lib/goals'
import { listProjects, type Project } from '../lib/productivity'
import '../styles/goalsTracking.css'

const statuses: Array<'all' | GoalStatus> = ['all', 'active', 'completed', 'archived']

export function GoalsPage() {
  const { session } = useAuth()
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<GoalWithProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progressInputs, setProgressInputs] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | GoalStatus>('active')
  const [form, setForm] = useState({ name: '', description: '', goal_type: 'numeric' as GoalType, metric: 'focus_minutes', target_value: '1200', unit: 'minutes', project_id: '', start_date: new Date().toISOString().slice(0, 10), target_date: '' })

  async function reload() {
    try {
      const [goalRows, projectRows] = await Promise.all([listGoalsWithProgress(), listProjects()])
      setGoals(goalRows)
      setProjects(projectRows)
      if (selected) setSelected(goalRows.find(goal => goal.id === selected.id) ?? null)
      setError(null)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load goals.') }
  }
  useEffect(() => { void reload() }, [session?.user.id])

  const visibleGoals = useMemo(() => goals.filter(goal => {
    const matchesStatus = statusFilter === 'all' || goal.status === statusFilter
    const haystack = `${goal.name} ${goal.description ?? ''} ${goal.projects?.name ?? ''}`.toLowerCase()
    return matchesStatus && haystack.includes(query.trim().toLowerCase())
  }), [goals, query, statusFilter])

  async function submitGoal(event: React.FormEvent) {
    event.preventDefault()
    if (!session?.user.id) return
    try {
      const isProject = form.goal_type === 'project_milestone'
      const isTask = form.goal_type === 'task_based'
      await createGoal({
        user_id: session.user.id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        goal_type: form.goal_type,
        metric: isProject ? null : isTask ? 'tasks_completed' : form.metric as 'focus_minutes' | 'tasks_completed' | 'manual_value',
        target_value: isProject ? 1 : Number(form.target_value),
        unit: isProject ? 'project' : isTask ? 'tasks' : form.unit || null,
        project_id: isProject ? form.project_id || null : null,
        start_date: form.start_date,
        target_date: form.target_date || null,
      })
      setShowForm(false)
      setForm({ name: '', description: '', goal_type: 'numeric', metric: 'focus_minutes', target_value: '1200', unit: 'minutes', project_id: '', start_date: new Date().toISOString().slice(0, 10), target_date: '' })
      await reload()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not create goal.') }
  }

  async function addProgress(goal: GoalWithProgress) {
    if (!session?.user.id) return
    const value = Number(progressInputs[goal.id] || 0)
    if (!value) return
    try {
      await recordGoalProgress(session.user.id, goal.id, value)
      setProgressInputs({ ...progressInputs, [goal.id]: '' })
      await reload()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update progress.') }
  }

  async function completeGoal(goalId: string) {
    try { await setGoalStatus(goalId, 'completed'); await reload() }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not complete goal.') }
  }

  async function saveGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    const data = new FormData(event.currentTarget)
    try {
      await updateGoal(selected.id, {
        name: String(data.get('name') || '').trim(),
        description: String(data.get('description') || '').trim() || null,
        target_value: selected.goal_type === 'project_milestone' ? 1 : Number(data.get('target_value') || selected.target_value || 0),
        unit: selected.goal_type === 'project_milestone' ? 'project' : String(data.get('unit') || '').trim() || null,
        project_id: selected.goal_type === 'project_milestone' ? String(data.get('project_id') || '') || null : null,
        start_date: String(data.get('start_date') || selected.start_date),
        target_date: String(data.get('target_date') || '') || null,
        status: String(data.get('status') || selected.status) as GoalStatus,
      })
      await reload()
      setSelected(null)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update goal.') }
  }

  async function removeGoal() {
    if (!selected || !window.confirm(`Delete “${selected.name}” permanently?`)) return
    try { await deleteGoal(selected.id); setSelected(null); await reload() }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not delete goal.') }
  }

  return <div>
    <header className="page-heading"><div><p className="eyebrow">GOALS</p><h1>Goals</h1><p className="muted">Track numeric targets, task goals, and project milestones.</p></div><button className="primary-button compact" onClick={() => setShowForm(!showForm)}><Plus size={16}/> New Goal</button></header>
    {error && <div className="error-banner">{error}</div>}

    <div className="goal-toolbar"><div className="goal-search"><Search size={15}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search goals…"/></div><div className="toolbar-group">{statuses.map(status => <button key={status} className={`toolbar-pill ${statusFilter===status?'active':''}`} onClick={() => setStatusFilter(status)}>{status[0].toUpperCase()+status.slice(1)}</button>)}</div></div>

    {showForm && <section className="panel create-panel"><div className="panel-header"><div><h2>Create Goal</h2><p>Choose how progress should be measured.</p></div></div><form className="task-form" onSubmit={submitGoal}>
      <label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></label>
      <label>Type<select value={form.goal_type} onChange={(event) => setForm({ ...form, goal_type: event.target.value as GoalType })}><option value="numeric">Numeric</option><option value="task_based">Task-based</option><option value="project_milestone">Project milestone</option></select></label>
      {form.goal_type === 'numeric' && <label>Metric<select value={form.metric} onChange={(event) => setForm({ ...form, metric: event.target.value })}><option value="focus_minutes">Focus minutes</option><option value="manual_value">Manual value</option></select></label>}
      {form.goal_type === 'project_milestone' && <label>Project<select required value={form.project_id} onChange={(event) => setForm({ ...form, project_id: event.target.value })}><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>}
      {form.goal_type !== 'project_milestone' && <label>Target<input required type="number" min="1" value={form.target_value} onChange={(event) => setForm({ ...form, target_value: event.target.value })}/></label>}
      {form.goal_type === 'numeric' && <label>Unit<input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })}/></label>}
      <label>Start date<input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })}/></label>
      <label>Target date<input type="date" value={form.target_date} onChange={(event) => setForm({ ...form, target_date: event.target.value })}/></label>
      <label className="form-span">Description<textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })}/></label>
      <div className="form-actions form-span"><button className="primary-button" type="submit">Create Goal</button><button className="secondary-button" type="button" onClick={() => setShowForm(false)}>Cancel</button></div>
    </form></section>}

    <section className="goal-grid">
      {visibleGoals.map((goal) => <article className="panel goal-card" key={goal.id}>
        <div className="goal-card-top"><div className="metric-icon"><Target/></div><div className="goal-card-actions-top"><span className={`project-status status-${goal.status}`}>{goal.status}</span><button className="icon-button" onClick={() => setSelected(goal)}><Edit3 size={15}/></button></div></div>
        <h2>{goal.name}</h2><p>{goal.description || 'No description.'}</p>
        <div className="goal-value"><strong>{goal.current_value}</strong><span>/ {goal.goal_type === 'project_milestone' ? 1 : goal.target_value} {goal.unit || ''}</span></div>
        <div className="progress-track large"><span style={{ width: `${goal.progress_percent}%` }}/></div>
        <div className="goal-meta"><span><Flag size={14}/> {goal.goal_type.replace('_', ' ')}</span><span>{goal.target_date ? `Due ${new Date(`${goal.target_date}T00:00:00`).toLocaleDateString()}` : 'No deadline'}</span></div>
        {goal.status === 'active' && <div className="goal-actions">
          {goal.metric === 'manual_value' && <div className="inline-form"><input type="number" placeholder="Add progress" value={progressInputs[goal.id] || ''} onChange={(event) => setProgressInputs({ ...progressInputs, [goal.id]: event.target.value })}/><button className="secondary-button compact-button" onClick={() => void addProgress(goal)}>Add</button></div>}
          <button className="text-button complete-goal" onClick={() => void completeGoal(goal.id)}><CheckCircle2 size={15}/> Mark complete</button>
        </div>}
      </article>)}
      {!visibleGoals.length && <div className="empty-state">No goals match this view.</div>}
    </section>

    {selected && <div className="drawer-backdrop" onMouseDown={event => { if(event.target===event.currentTarget)setSelected(null) }}><aside className="task-drawer"><div className="drawer-header"><div><span className={`project-status status-${selected.status}`}>{selected.status}</span><h2>{selected.name}</h2></div><button className="icon-button" onClick={() => setSelected(null)}><X size={18}/></button></div><form className="focus-form goal-edit-form" onSubmit={saveGoal}><label>Name<input name="name" defaultValue={selected.name} required/></label><label>Description<textarea name="description" rows={4} defaultValue={selected.description ?? ''}/></label>{selected.goal_type !== 'project_milestone' && <label>Target<input name="target_value" type="number" min="1" defaultValue={selected.target_value ?? 1}/></label>}{selected.goal_type !== 'project_milestone' && <label>Unit<input name="unit" defaultValue={selected.unit ?? ''}/></label>}{selected.goal_type === 'project_milestone' && <label>Project<select name="project_id" defaultValue={selected.project_id ?? ''}>{projects.map(project => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label>}<label>Start date<input name="start_date" type="date" defaultValue={selected.start_date}/></label><label>Target date<input name="target_date" type="date" defaultValue={selected.target_date ?? ''}/></label><label>Status<select name="status" defaultValue={selected.status}><option value="active">Active</option><option value="completed">Completed</option><option value="archived">Archived</option></select></label><button className="primary-button" type="submit">Save goal</button></form><section className="drawer-section destructive-actions"><button className="secondary-button" onClick={() => void setGoalStatus(selected.id,'archived').then(reload).then(()=>setSelected(null))}><Archive size={15}/> Archive</button><button className="text-button danger" onClick={() => void removeGoal()}><Trash2 size={15}/> Delete permanently</button></section></aside></div>}
  </div>
}
