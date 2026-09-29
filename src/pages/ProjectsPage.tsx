import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Search, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { createProject, listProjects, listTasks, updateProject, updateProjectStatus, type Project, type ProjectStatus, type Task } from '../lib/productivity'
import { calculateProjectMetrics } from '../lib/projectMetrics'
import '../styles/projectProgress.css'

const statuses: ProjectStatus[] = ['planned','active','on_hold','completed','archived']
const labels: Record<ProjectStatus,string> = { planned:'Planned', active:'Active', on_hold:'On Hold', completed:'Completed', archived:'Archived' }

type StatusFilter = 'all' | ProjectStatus

export function ProjectsPage() {
  const { session } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Project | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => { void Promise.all([listProjects(), listTasks()]).then(([projectRows, taskRows]) => { setProjects(projectRows); setTasks(taskRows) }).catch(err => setError(err.message)) }, [])

  const visibleProjects = useMemo(() => {
    const query = search.trim().toLowerCase()
    return projects.filter(project => (statusFilter === 'all' || project.status === statusFilter) && (!query || project.name.toLowerCase().includes(query) || (project.description ?? '').toLowerCase().includes(query)))
  }, [projects, search, statusFilter])

  async function handleCreate(form: HTMLFormElement) {
    if (!session?.user.id) return
    const data = new FormData(form)
    try {
      const project = await createProject({
        user_id: session.user.id,
        name: String(data.get('name') || '').trim(),
        description: String(data.get('description') || '').trim() || null,
        status: String(data.get('status') || 'planned') as ProjectStatus,
        start_date: String(data.get('start_date') || '') || null,
        target_date: String(data.get('target_date') || '') || null,
      })
      setProjects(current => [project, ...current])
      setShowForm(false)
      form.reset()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not create project.') }
  }

  async function saveProject(form: HTMLFormElement) {
    if (!selected) return
    const data = new FormData(form)
    try {
      const updated = await updateProject(selected.id, {
        name: String(data.get('name') || '').trim(),
        description: String(data.get('description') || '').trim() || null,
        start_date: String(data.get('start_date') || '') || null,
        target_date: String(data.get('target_date') || '') || null,
      })
      setProjects(current => current.map(item => item.id === updated.id ? updated : item))
      setSelected(updated)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update project.') }
  }

  async function changeStatus(project: Project, status: ProjectStatus) {
    const previous = projects
    setProjects(current => current.map(item => item.id === project.id ? { ...item, status } : item))
    try {
      const updated = await updateProjectStatus(project.id, status)
      setProjects(current => current.map(item => item.id === project.id ? updated : item))
      if (selected?.id === updated.id) setSelected(updated)
    } catch (err) {
      setProjects(previous)
      setError(err instanceof Error ? err.message : 'Could not update project.')
    }
  }

  return <>
    <div className="page-heading"><div><div className="eyebrow">PROJECTS</div><h1>Projects</h1><p className="muted">Group tasks into outcomes and track work from planning through archive.</p></div><button className="primary-button" onClick={() => setShowForm(!showForm)}><Plus size={17}/> New project</button></div>
    {error && <div className="error-banner">{error}</div>}
    <div className="project-filter-bar"><label><Search size={16}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search projects…"/></label><select value={statusFilter} onChange={event=>setStatusFilter(event.target.value as StatusFilter)}><option value="all">All statuses</option>{statuses.map(status=><option key={status} value={status}>{labels[status]}</option>)}</select><span>{visibleProjects.length} project{visibleProjects.length===1?'':'s'}</span></div>
    {showForm && <div className="panel create-panel"><form className="task-form" onSubmit={(event) => { event.preventDefault(); void handleCreate(event.currentTarget) }}>
      <label>Name<input name="name" required autoFocus /></label>
      <label>Status<select name="status" defaultValue="planned">{statuses.map(status => <option value={status} key={status}>{labels[status]}</option>)}</select></label>
      <label>Start date<input type="date" name="start_date"/></label><label>Target date<input type="date" name="target_date"/></label>
      <label className="form-span">Description<textarea name="description" rows={3}/></label>
      <div className="form-span form-actions"><button className="primary-button" type="submit">Create project</button><button className="secondary-button" type="button" onClick={() => setShowForm(false)}>Cancel</button></div>
    </form></div>}
    <div className="project-grid">{visibleProjects.map(project => { const metrics = calculateProjectMetrics(tasks.filter(task => task.project_id === project.id)); return <article className="panel project-card" key={project.id}><div className="project-card-top"><span className={`project-status status-${project.status}`}>{labels[project.status]}</span><select value={project.status} onChange={event => void changeStatus(project,event.target.value as ProjectStatus)}>{statuses.map(status => <option value={status} key={status}>{labels[status]}</option>)}</select></div><h2>{project.name}</h2><p>{project.description || 'No description yet.'}</p><div className="project-progress-row"><div><strong>{metrics.progressPercent}%</strong><span>{metrics.completedTasks}/{metrics.totalTasks} tasks complete</span></div><div className="progress-track"><span style={{ width: `${metrics.progressPercent}%` }}/></div><small>{metrics.openTasks} open · {Math.round(metrics.trackedMinutes / 60 * 10) / 10}h tracked</small></div><div className="project-dates"><span>Start <strong>{project.start_date || '—'}</strong></span><span>Target <strong>{project.target_date || '—'}</strong></span></div><button className="secondary-button project-edit-button" onClick={()=>setSelected(project)}><Pencil size={15}/> Edit project</button></article> })}{visibleProjects.length === 0 && <div className="panel empty-state">No projects match the current filters.</div>}</div>
    {selected && <div className="drawer-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setSelected(null)}}><aside className="task-drawer project-drawer"><div className="drawer-header"><div><span className={`project-status status-${selected.status}`}>{labels[selected.status]}</span><h2>{selected.name}</h2></div><button className="icon-button" onClick={()=>setSelected(null)}><X size={18}/></button></div><form className="task-edit-form" onSubmit={event=>{event.preventDefault();void saveProject(event.currentTarget)}}><label className="form-span">Name<input name="name" defaultValue={selected.name} required/></label><label>Start date<input type="date" name="start_date" defaultValue={selected.start_date ?? ''}/></label><label>Target date<input type="date" name="target_date" defaultValue={selected.target_date ?? ''}/></label><label className="form-span">Description<textarea name="description" rows={5} defaultValue={selected.description ?? ''}/></label><button className="primary-button form-span" type="submit">Save project</button></form><section className="drawer-section"><h3>Status</h3><select className="project-status-select" value={selected.status} onChange={event=>void changeStatus(selected,event.target.value as ProjectStatus)}>{statuses.map(status=><option key={status} value={status}>{labels[status]}</option>)}</select></section></aside></div>}
  </>
}
