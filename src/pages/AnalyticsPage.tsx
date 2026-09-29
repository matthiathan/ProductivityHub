import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { listProductivitySnapshots } from '../lib/analyticsHistory'
import '../styles/pagePolish.css'

type Range = 7 | 30 | 90

type Snapshot = {
  snapshot_date: string
  score: number
  task_completion: number
  focus_time: number
  deadline_performance: number
  goal_progress: number
  consistency: number
  workload_control: number
  focus_minutes: number
  tasks_completed: number
  overdue_tasks: number
}

export function AnalyticsPage() {
  const [data, setData] = useState<Snapshot[]>([])
  const [range, setRange] = useState<Range>(30)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { void listProductivitySnapshots(90).then(rows => setData(rows as Snapshot[])).catch(e => setError(e instanceof Error ? e.message : 'Could not load analytics.')) }, [])

  const visible = useMemo(() => data.slice(-range), [data, range])
  const latest = visible.at(-1)
  const averages = useMemo(() => {
    if (!visible.length) return null
    const avg = (key: keyof Snapshot) => Math.round(visible.reduce((sum, row) => sum + Number(row[key] || 0), 0) / visible.length)
    return { score: avg('score'), focusMinutes: avg('focus_minutes'), tasksCompleted: avg('tasks_completed'), overdueTasks: avg('overdue_tasks') }
  }, [visible])

  const componentData = latest ? [
    { name:'Tasks', value:latest.task_completion },
    { name:'Focus', value:latest.focus_time },
    { name:'Deadlines', value:latest.deadline_performance },
    { name:'Goals', value:latest.goal_progress },
    { name:'Consistency', value:latest.consistency },
    { name:'Workload', value:latest.workload_control },
  ] : []

  return <div>
    <header className="page-heading"><div><p className="eyebrow">ANALYTICS</p><h1>Analytics</h1><p className="muted">Historical productivity, raw workload, and component trends.</p></div><div className="analytics-range">{([7,30,90] as Range[]).map(value => <button key={value} className={range===value?'toolbar-pill active':'toolbar-pill'} onClick={()=>setRange(value)}>{value} days</button>)}</div></header>
    {error&&<div className="error-banner">{error}</div>}
    {latest && averages && <section className="analytics-kpis"><article className="panel"><span>Current score</span><strong>{latest.score}</strong><small>{averages.score} average</small></article><article className="panel"><span>Focus today</span><strong>{Math.round(latest.focus_minutes/6)/10}h</strong><small>{Math.round(averages.focusMinutes/6)/10}h daily average</small></article><article className="panel"><span>Tasks completed</span><strong>{latest.tasks_completed}</strong><small>{averages.tasksCompleted} daily average</small></article><article className="panel"><span>Overdue tasks</span><strong>{latest.overdue_tasks}</strong><small>{averages.overdueTasks} daily average</small></article></section>}
    <section className="analytics-grid">
      <article className="panel"><div className="panel-header"><div><h2>Productivity Score</h2><p>Composite score and focus component over time</p></div></div><div className="chart-wrap">{visible.length?<ResponsiveContainer width="100%" height="100%"><AreaChart data={visible}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)"/><XAxis dataKey="snapshot_date" stroke="#667085"/><YAxis domain={[0,100]} stroke="#667085"/><Tooltip contentStyle={{background:'#111827',border:'1px solid #273244',borderRadius:12}}/><Legend/><Area type="monotone" dataKey="score" name="Score" stroke="#8b5cf6" fill="#8b5cf633"/><Area type="monotone" dataKey="focus_time" name="Focus component" stroke="#3b82f6" fill="#3b82f622"/></AreaChart></ResponsiveContainer>:<div className="empty-state">Analytics populate as daily snapshots are recorded.</div>}</div></article>
      <article className="panel"><div className="panel-header"><div><h2>Score Components</h2><p>Latest snapshot, shown independently from the composite score</p></div></div><div className="chart-wrap">{componentData.length?<ResponsiveContainer width="100%" height="100%"><BarChart data={componentData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)"/><XAxis type="number" domain={[0,100]} stroke="#667085"/><YAxis type="category" dataKey="name" width={82} stroke="#667085"/><Tooltip contentStyle={{background:'#111827',border:'1px solid #273244',borderRadius:12}}/><Bar dataKey="value" fill="#8b5cf6" radius={[0,6,6,0]}/></BarChart></ResponsiveContainer>:<div className="empty-state">No component history yet.</div>}</div></article>
      <article className="panel analytics-span"><div className="panel-header"><div><h2>Output & Workload</h2><p>Completed tasks, overdue tasks, and focus minutes—the raw inputs behind the score.</p></div></div><div className="chart-wrap">{visible.length?<ResponsiveContainer width="100%" height="100%"><BarChart data={visible}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)"/><XAxis dataKey="snapshot_date" stroke="#667085"/><YAxis yAxisId="left" stroke="#667085"/><YAxis yAxisId="right" orientation="right" stroke="#667085"/><Tooltip contentStyle={{background:'#111827',border:'1px solid #273244',borderRadius:12}}/><Legend/><Bar yAxisId="left" dataKey="tasks_completed" name="Tasks completed" fill="#22c55e"/><Bar yAxisId="left" dataKey="overdue_tasks" name="Overdue tasks" fill="#ef4444"/><Bar yAxisId="right" dataKey="focus_minutes" name="Focus minutes" fill="#3b82f6"/></BarChart></ResponsiveContainer>:<div className="empty-state">No output history yet.</div>}</div></article>
    </section>
  </div>
}
