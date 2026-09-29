import { RotateCcw, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { DEFAULT_PRODUCTIVITY_WEIGHTS, type ProductivityWeights } from '../lib/productivityScore'
import { updateUserSettings } from '../lib/settings'
import { getUserSettings } from '../lib/tracking'
import '../styles/pagePolish.css'

const labels: Record<keyof ProductivityWeights, string> = {
  taskCompletion: 'Task completion',
  focusTime: 'Focus time',
  deadlinePerformance: 'Deadline performance',
  goalProgress: 'Goal progress',
  consistency: 'Consistency',
  workloadControl: 'Workload control',
}

export function SettingsPage() {
  const { session } = useAuth()
  const [daily, setDaily] = useState(240)
  const [weekly, setWeekly] = useState(1800)
  const [weights, setWeights] = useState<ProductivityWeights>(DEFAULT_PRODUCTIVITY_WEIGHTS)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session?.user.id) return
    void getUserSettings(session.user.id).then(settings => {
      setDaily(settings.daily_focus_target_minutes)
      setWeekly(settings.weekly_focus_target_minutes)
      setWeights({ ...DEFAULT_PRODUCTIVITY_WEIGHTS, ...settings.productivity_weights } as ProductivityWeights)
    })
  }, [session?.user.id])

  const totalWeight = useMemo(() => Object.values(weights).reduce((sum, value) => sum + Number(value || 0), 0), [weights])

  async function save() {
    if (!session?.user.id) return
    setMsg('')
    setError('')
    if (daily <= 0 || weekly <= 0) { setError('Focus targets must be greater than zero.'); return }
    if (totalWeight <= 0) { setError('At least one productivity-score component needs a positive weight.'); return }
    try {
      await updateUserSettings(session.user.id, { daily_focus_target_minutes: daily, weekly_focus_target_minutes: weekly, productivity_weights: weights })
      setMsg('Settings saved.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save settings.') }
  }

  function resetWeights() {
    setWeights(DEFAULT_PRODUCTIVITY_WEIGHTS)
    setMsg('')
    setError('')
  }

  return <div>
    <header className="page-heading"><div><p className="eyebrow">SETTINGS</p><h1>Settings</h1><p className="muted">Tune your targets and keep the productivity score transparent.</p></div></header>
    {error && <div className="error-banner">{error}</div>}
    <section className="panel settings-panel">
      <div className="settings-section-header"><div><h2>Focus targets</h2><p className="muted">Used by the dashboard and focus component of the score.</p></div></div>
      <div className="settings-grid"><label>Daily focus target (minutes)<input type="number" min="1" value={daily} onChange={e=>setDaily(Number(e.target.value))}/><small>{(daily/60).toFixed(1)} hours/day</small></label><label>Weekly focus target (minutes)<input type="number" min="1" value={weekly} onChange={e=>setWeekly(Number(e.target.value))}/><small>{(weekly/60).toFixed(1)} hours/week</small></label></div>
      <div className="settings-section-header"><div><h2>Productivity score weights</h2><p className="muted">Weights are relative. They do not need to add up to 100.</p></div><button className="secondary-button" onClick={resetWeights}><RotateCcw size={15}/> Reset defaults</button></div>
      <div className="weight-total"><strong>Total weight: {totalWeight}</strong><span>Each component's effective share is calculated from this total.</span></div>
      <div className="settings-grid score-weight-grid">{(Object.entries(weights) as [keyof ProductivityWeights, number][]).map(([key,value]) => <label key={key}><span className="weight-label"><span>{labels[key]}</span><strong>{totalWeight > 0 ? Math.round((value/totalWeight)*100) : 0}%</strong></span><input type="number" min="0" step="1" value={value} onChange={e=>setWeights({...weights,[key]:Number(e.target.value)})}/></label>)}</div>
      <div className="settings-actions"><button className="primary-button" onClick={()=>void save()}><Save size={16}/> Save Settings</button>{msg&&<p className="form-success inline-success">{msg}</p>}</div>
    </section>
  </div>
}
