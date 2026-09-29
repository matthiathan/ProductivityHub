import { Activity, CheckCircle2, Clock3, FileText, FolderKanban, Plus, Repeat2, Target, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { getDashboardAnalytics } from '../lib/analytics'
import { listTasks, type Task } from '../lib/productivity'

type DashboardData = Awaited<ReturnType<typeof getDashboardAnalytics>>

const componentLabels: Record<string, string> = {
  taskCompletion: 'Task completion',
  focusTime: 'Focus time',
  deadlinePerformance: 'Deadline performance',
  goalProgress: 'Goal progress',
  consistency: 'Consistency',
  workloadControl: 'Workload control',
}

const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 }

function formatFocus(minutes: number) {
  const hours = minutes / 60
  return hours >= 10 ? `${Math.round(hours)}h` : `${hours.toFixed(1)}h`
}

export function DashboardPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.user.id) return
    let cancelled = false
    void Promise.all([getDashboardAnalytics(session.user.id), listTasks()])
      .then(([analytics, taskRows]) => {
        if (cancelled) return
        setData(analytics)
        setTasks(taskRows)
        setError(null)
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load dashboard.') })
    return () => { cancelled = true }
  }, [session?.user.id])

  const priorities = useMemo(() => tasks
    .filter((task) => task.status !== 'done')
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || (a.due_at || '9999').localeCompare(b.due_at || '9999'))
    .slice(0, 5), [tasks])

  const today = new Intl.DateTimeFormat('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toUpperCase()
  const history = (data?.history ?? []).map((point) => ({ day: new Date(`${point.snapshot_date}T00:00:00`).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' }), score: point.score, focus: Math.round((point.focus_minutes / 60) * 10) / 10 }))

  return <div className="dashboard-page">
    <header className="page-heading">
      <div><p className="eyebrow">{today}</p><h1>Good morning</h1><p className="muted">Your personal productivity command centre.</p></div>
      <button className="primary-button compact" onClick={() => navigate('/tasks')}><Plus size={15}/> New Task</button>
    </header>
    {error && <div className="error-banner">{error}</div>}

    <div className="dashboard-quick-actions">
      <button className="quick-action-button" onClick={() => navigate('/tasks')}><Plus size={15}/> New task</button>
      <button className="quick-action-button" onClick={() => navigate('/recurring')}><Repeat2 size={15}/> Recurring schedules</button>
      <button className="quick-action-button" onClick={() => navigate('/focus')}><Clock3 size={15}/> Start focus</button>
      <button className="quick-action-button" onClick={() => navigate('/notes')}><FileText size={15}/> Open notes</button>
    </div>

    <section className="metric-grid">
      <Metric icon={<TrendingUp />} label="Productivity Score" value={data ? String(data.score) : '—'} delta="Weighted from six visible metrics" />
      <Metric icon={<CheckCircle2 />} label="Tasks Completed" value={data ? String(data.completedTasks) : '—'} delta={data ? `${data.openTasks} still open` : 'Loading…'} />
      <Metric icon={<Clock3 />} label="Focus This Week" value={data ? formatFocus(data.weeklyFocusMinutes) : '—'} delta={data ? `${Math.min(100, Math.round(data.weeklyFocusMinutes / data.weeklyFocusTargetMinutes * 100))}% of weekly target` : 'Loading…'} />
      <Metric icon={<FolderKanban />} label="Active Projects" value={data ? String(data.activeProjects) : '—'} delta={data ? `${data.overdueTasks} overdue tasks` : 'Loading…'} />
    </section>

    <section className="dashboard-grid">
      <article className="panel wide-panel">
        <div className="panel-header"><div><h2>Productivity Trends</h2><p>Daily productivity snapshots</p></div><span className="pill">Last 30 days</span></div>
        <div className="chart-wrap">
          {history.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={history}>
            <defs><linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.32}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)"/><XAxis dataKey="day" stroke="#667085" axisLine={false} tickLine={false}/><YAxis stroke="#667085" axisLine={false} tickLine={false} domain={[0,100]}/><Tooltip contentStyle={{ background:'#111827', border:'1px solid #273244', borderRadius:12 }}/><Area type="monotone" dataKey="score" stroke="#8b5cf6" fill="url(#scoreFill)" strokeWidth={3}/>
          </AreaChart></ResponsiveContainer> : <div className="empty-state">Your trend builds automatically as daily snapshots accumulate.</div>}
        </div>
      </article>

      <article className="panel score-panel">
        <div className="panel-header"><div><h2>Score Breakdown</h2><p>Transparent productivity inputs</p></div><Activity size={18}/></div>
        {data ? Object.entries(data.components).map(([key, score]) => <div className="score-row" key={key}><div><span>{componentLabels[key] ?? key}</span><strong>{score}</strong></div><div className="progress-track"><span style={{ width:`${score}%` }}/></div></div>) : <div className="empty-state">Calculating score…</div>}
      </article>

      <article className="panel task-panel">
        <div className="panel-header"><div><h2>My To-Do</h2><p>Priority work requiring attention</p></div><button className="text-button" onClick={() => navigate('/tasks')}>View all</button></div>
        <div className="task-list">{priorities.map((task) => <div className="task-row" key={task.id}><button className="task-check" aria-label={`Open ${task.title}`} onClick={() => navigate('/tasks')}/><div className="task-copy"><strong>{task.title}</strong><span>{task.due_at ? `Due ${new Date(task.due_at).toLocaleString('en-ZA', { dateStyle:'medium', timeStyle:'short' })}` : 'No due date'}</span></div><span className={`priority priority-${task.priority}`}>{task.priority}</span></div>)}{!priorities.length && <div className="empty-state">No open tasks.</div>}</div>
      </article>

      <article className="panel focus-panel">
        <div className="panel-header"><div><h2>Focus Goal</h2><p>Weekly target progress</p></div><Target size={18}/></div>
        <div className="focus-number">{data ? formatFocus(data.weeklyFocusMinutes) : '—'} <span>/ {data ? formatFocus(data.weeklyFocusTargetMinutes) : '—'}</span></div>
        <div className="progress-track large"><span style={{ width:`${data ? Math.min(100, Math.round(data.weeklyFocusMinutes / data.weeklyFocusTargetMinutes * 100)) : 0}%` }}/></div>
        <p className="muted">{data ? `${formatFocus(Math.max(0, data.weeklyFocusTargetMinutes - data.weeklyFocusMinutes))} remaining this week.` : 'Loading focus progress…'}</p>
        <button className="primary-button" onClick={() => navigate('/focus')}>Start Focus Session</button>
      </article>

      <article className="panel wide-panel dashboard-goals">
        <div className="panel-header"><div><h2>Active Goals</h2><p>Progress across your current targets</p></div><button className="text-button" onClick={() => navigate('/goals')}>Manage goals</button></div>
        <div className="goal-summary-list">{data?.goals.slice(0,4).map((goal) => <div className="goal-summary" key={goal.id}><div><strong>{goal.name}</strong><span>{goal.progress_percent}%</span></div><div className="progress-track"><span style={{ width:`${goal.progress_percent}%` }}/></div></div>)}{data && !data.goals.length && <div className="empty-state">No active goals yet.</div>}</div>
      </article>
    </section>
  </div>
}

function Metric({ icon, label, value, delta }: { icon: React.ReactNode; label: string; value: string; delta: string }) {
  return <article className="metric-card"><div className="metric-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{delta}</small></div></article>
}
