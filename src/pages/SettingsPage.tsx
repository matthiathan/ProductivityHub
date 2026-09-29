import { LogOut, RotateCcw, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { DEFAULT_PRODUCTIVITY_WEIGHTS, type ProductivityWeights } from '../lib/productivityScore'
import { updateUserSettings } from '../lib/settings'
import { getUserSettings } from '../lib/tracking'
import '../styles/pagePolish.css'

const labels: Record<keyof ProductivityWeights, string> = {
  taskCompletion: 'Task completion', focusTime: 'Focus time', deadlinePerformance: 'Deadline performance', goalProgress: 'Goal progress', consistency: 'Consistency', workloadControl: 'Workload control',
}

export function SettingsPage() {
  const { session, updatePassword, signOut } = useAuth()
  const [daily, setDaily] = useState(240)
  const [weekly, setWeekly] = useState(1800)
  const [weeklyTasks, setWeeklyTasks] = useState(20)
  const [defaultPriority, setDefaultPriority] = useState<'low'|'medium'|'high'|'critical'>('medium')
  const [defaultView, setDefaultView] = useState<'all'|'today'|'upcoming'|'overdue'|'completed'>('all')
  const [weekStart, setWeekStart] = useState(1)
  const [workStart, setWorkStart] = useState('08:00')
  const [workEnd, setWorkEnd] = useState('17:00')
  const [weights, setWeights] = useState<ProductivityWeights>(DEFAULT_PRODUCTIVITY_WEIGHTS)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session?.user.id) return
    void getUserSettings(session.user.id).then(settings => {
      setDaily(settings.daily_focus_target_minutes); setWeekly(settings.weekly_focus_target_minutes); setWeeklyTasks(settings.weekly_task_target)
      setDefaultPriority(settings.default_priority); setDefaultView(settings.default_task_view); setWeekStart(settings.week_starts_on)
      setWorkStart(settings.working_day_start.slice(0,5)); setWorkEnd(settings.working_day_end.slice(0,5))
      setWeights({ ...DEFAULT_PRODUCTIVITY_WEIGHTS, ...settings.productivity_weights } as ProductivityWeights)
    }).catch(e=>setError(e instanceof Error?e.message:'Could not load settings.'))
  }, [session?.user.id])

  const totalWeight = useMemo(() => Object.values(weights).reduce((sum, value) => sum + Number(value || 0), 0), [weights])

  async function save() {
    if (!session?.user.id) return
    setMsg(''); setError('')
    if (daily <= 0 || weekly <= 0 || weeklyTasks <= 0) return setError('Targets must be greater than zero.')
    if (workEnd <= workStart) return setError('Working day end must be after the start time.')
    if (totalWeight <= 0) return setError('At least one productivity-score component needs a positive weight.')
    try {
      await updateUserSettings(session.user.id, { daily_focus_target_minutes: daily, weekly_focus_target_minutes: weekly, weekly_task_target: weeklyTasks, default_priority: defaultPriority, default_task_view: defaultView, week_starts_on: weekStart, working_day_start: workStart, working_day_end: workEnd, productivity_weights: weights })
      setMsg('Settings saved.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save settings.') }
  }

  async function changePassword() {
    setMsg(''); setError('')
    if (password.length < 8) return setError('Use at least 8 characters for the new password.')
    if (password !== passwordConfirm) return setError('Passwords do not match.')
    const authError = await updatePassword(password)
    if (authError) return setError(authError)
    setPassword(''); setPasswordConfirm(''); setMsg('Password changed successfully.')
  }

  return <div>
    <header className="page-heading"><div><p className="eyebrow">SETTINGS</p><h1>Settings</h1><p className="muted">Tune targets, defaults, working hours, score weights, and account security.</p></div></header>
    {error && <div className="error-banner">{error}</div>}
    <section className="panel settings-panel">
      <div className="settings-section-header"><div><h2>Targets</h2><p className="muted">Used by dashboard and productivity analytics.</p></div></div>
      <div className="settings-grid"><label>Daily focus target<input type="number" min="1" value={daily} onChange={e=>setDaily(Number(e.target.value))}/><small>minutes/day</small></label><label>Weekly focus target<input type="number" min="1" value={weekly} onChange={e=>setWeekly(Number(e.target.value))}/><small>minutes/week</small></label><label>Weekly task target<input type="number" min="1" value={weeklyTasks} onChange={e=>setWeeklyTasks(Number(e.target.value))}/><small>completed tasks/week</small></label></div>
      <div className="settings-section-header"><div><h2>Task defaults</h2><p className="muted">Applied when you open Tasks or create a new task.</p></div></div>
      <div className="settings-grid"><label>Default priority<select value={defaultPriority} onChange={e=>setDefaultPriority(e.target.value as typeof defaultPriority)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label><label>Default task view<select value={defaultView} onChange={e=>setDefaultView(e.target.value as typeof defaultView)}><option value="all">All</option><option value="today">Today</option><option value="upcoming">Upcoming</option><option value="overdue">Overdue</option><option value="completed">Completed</option></select></label></div>
      <div className="settings-section-header"><div><h2>Schedule</h2><p className="muted">Controls your preferred work-week presentation.</p></div></div>
      <div className="settings-grid"><label>Week starts on<select value={weekStart} onChange={e=>setWeekStart(Number(e.target.value))}><option value={1}>Monday</option><option value={0}>Sunday</option></select></label><label>Working day starts<input type="time" value={workStart} onChange={e=>setWorkStart(e.target.value)}/></label><label>Working day ends<input type="time" value={workEnd} onChange={e=>setWorkEnd(e.target.value)}/></label></div>
      <div className="settings-section-header"><div><h2>Productivity score weights</h2><p className="muted">Weights are relative and do not need to total 100.</p></div><button className="secondary-button" onClick={()=>setWeights(DEFAULT_PRODUCTIVITY_WEIGHTS)}><RotateCcw size={15}/> Reset defaults</button></div>
      <div className="weight-total"><strong>Total weight: {totalWeight}</strong><span>Effective percentages are normalized automatically.</span></div>
      <div className="settings-grid score-weight-grid">{(Object.entries(weights) as [keyof ProductivityWeights, number][]).map(([key,value]) => <label key={key}><span className="weight-label"><span>{labels[key]}</span><strong>{totalWeight > 0 ? Math.round((value/totalWeight)*100) : 0}%</strong></span><input type="number" min="0" value={value} onChange={e=>setWeights({...weights,[key]:Number(e.target.value)})}/></label>)}</div>
      <div className="settings-actions"><button className="primary-button" onClick={()=>void save()}><Save size={16}/> Save Settings</button>{msg&&<p className="form-success inline-success">{msg}</p>}</div>
    </section>

    <section className="panel settings-panel" style={{marginTop:16}}>
      <div className="settings-section-header"><div><h2>Account</h2><p className="muted">Signed in as {session?.user.email ?? '—'}.</p></div></div>
      <div className="settings-grid"><label>New password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password"/></label><label>Confirm password<input type="password" value={passwordConfirm} onChange={e=>setPasswordConfirm(e.target.value)} autoComplete="new-password"/></label></div>
      <div className="settings-actions"><button className="secondary-button" onClick={()=>void changePassword()}>Change password</button><button className="text-button danger" onClick={()=>void signOut()}><LogOut size={15}/> Sign out</button></div>
    </section>
  </div>
}
