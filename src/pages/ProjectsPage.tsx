import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { createProject, listProjects, listTasks, updateProjectStatus, type Project, type ProjectStatus, type Task } from '../lib/productivity'
import { calculateProjectMetrics } from '../lib/projectMetrics'
import '../styles/projectProgress.css'

const statuses: ProjectStatus[] = ['planned','active','on_hold','completed','archived']
const labels: Record<ProjectStatus,string> = { planned:'Planned', active:'Active', on_hold:'On Hold', completed:'Completed', archived:'Archived' }

export function ProjectsPage() {
  const { session } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { void Promise.all([listProjects(), listTasks()]).then(([projectRows, taskRows]) => { setProjects(projectRows); setTasks(taskRows) }).catch(err => setError(err.message)) }, [])

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

  async function changeStatus(project: Project, status: ProjectStatus) {
    const previous = projects
    setProjects(current => current.map(item => item.id === project.id ? { ...item, status } : item))
    try {
      const updated = await updateProjectStatus(project.id, status)
      setProjects(current => current.map(item => item.id === project.id ? updated : item))
    } catch (err) {
      setProjects(previous)
      setError(err instanceof Error ? err.message : 'Could not update project.')
    }
  }

  return <>
    <div className="page-heading"><div><div className="eyebrow">PROJECTS</div><h1>Projects</h1><p className="muted">Group tasks into outcomes and track work from planning through archive.</p></div><button className="primary-button" onClick={() => setShowForm(!showForm)}><Plus size={17}/> New project</button></div>
    {error && <div className="error-banner">{error}</div>}
    {showForm && <div className="panel create-panel"><form className="task-form" onSubmit={(event) => { event.preventDefault(); void handleCreate(event.currentTarget) }}>
      <label>Name<input name="name" required autoFocus /></label>
      <label>Status<select name="status" defaultValue="planned">{statuses.map(status => <option value={status} key={status}>{labels[status]}</option>)}</select></label>
      <label>Start date<input type="date" name="start_date"/></label><label>Target date<input type="date" name="target_date"/></label>
      <label className="form-span">Description<textarea name="description" rows={3}/></label>
      <div className="form-span form-actions"><button className="primary-button" type="submit">Create project</button><button className="secondary-button" type="button" onClick={() => setShowForm(false)}>Cancel</button></div>
    </form></div>}
    <div className="project-grid">{projects.map(project => { const metrics = calculateProjectMetrics(tasks.filter(task => task.project_id === project.id)); return <article className="panel project-card" key={project.id}><div className="project-card-top"><span className={`project-status status-${project.status}`}>{labels[project.status]}</span><select value={project.status} onChange={event => void changeStatus(project,event.target.value as ProjectStatus)}>{statuses.map(status => <option value={status} key={status}>{labels[status]}</option>)}</select></div><h2>{project.name}</h2><p>{project.description || 'No description yet.'}</p><div className="project-progress-row"><div><strong>{metrics.progressPercent}%</strong><span>{metrics.completedTasks}/{metrics.totalTasks} tasks complete</span></div><div className="progress-track"><span style={{ width: `${metrics.progressPercent}%` }}/></div><small>{metrics.openTasks} open · {Math.round(metrics.trackedMinutes / 60 * 10) / 10}h tracked</small></div><div className="project-dates"><span>Start <strong>{project.start_date || '—'}</strong></span><span>Target <strong>{project.target_date || '—'}</strong></span></div></article> })}{projects.length === 0 && <div className="panel empty-state">No projects yet. Create the first one to group related tasks.</div>}</div>
  </>
}
