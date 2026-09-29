import { Archive, RefreshCcw, Repeat2, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { archiveTask, generateTaskOccurrences, listRecurringTemplates, restoreTask, type Task } from '../lib/productivity'

function recurrenceLabel(task: Task) {
  const frequency = String(task.recurrence_rule?.frequency ?? 'daily')
  const interval = Number(task.recurrence_rule?.interval ?? 1)
  const unit = frequency === 'daily' ? 'day' : frequency === 'weekly' ? 'week' : 'month'
  return `Every ${interval === 1 ? '' : `${interval} `}${unit}${interval === 1 ? '' : 's'}`
}

export function RecurringPage() {
  const [templates, setTemplates] = useState<Task[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [error, setError] = useState('')
  const [workingId, setWorkingId] = useState<string | null>(null)

  async function reload() {
    try { setTemplates(await listRecurringTemplates(true)); setError('') }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load recurring templates.') }
  }
  useEffect(() => { void reload() }, [])

  const visible = useMemo(() => templates.filter(item => showArchived || !item.archived_at), [templates, showArchived])

  async function runNow(template: Task) {
    setWorkingId(template.id)
    try { await generateTaskOccurrences(template.id); await reload() }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not generate occurrences.') }
    finally { setWorkingId(null) }
  }

  async function toggleArchived(template: Task) {
    setWorkingId(template.id)
    try {
      if (template.archived_at) await restoreTask(template.id)
      else await archiveTask(template.id)
      await reload()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update recurrence.') }
    finally { setWorkingId(null) }
  }

  return <div>
    <header className="page-heading"><div><p className="eyebrow">AUTOMATION</p><h1>Recurring Tasks</h1><p className="muted">Manage recurring templates without deleting historical occurrences.</p></div><button className="secondary-button" onClick={() => setShowArchived(value => !value)}>{showArchived ? 'Hide archived' : 'Show archived'}</button></header>
    {error && <div className="error-banner">{error}</div>}
    <section className="recurring-grid">{visible.map(template => <article className={`panel recurring-card ${template.archived_at ? 'recurring-paused' : ''}`} key={template.id}>
      <div className="recurring-card-head"><div className="metric-icon"><Repeat2 size={18}/></div><span className={`project-status ${template.archived_at ? 'status-archived' : 'status-active'}`}>{template.archived_at ? 'Paused' : 'Active'}</span></div>
      <h2>{template.title}</h2>
      <p>{template.description || 'No description.'}</p>
      <div className="recurring-meta"><span><strong>Schedule</strong>{recurrenceLabel(template)}</span><span><strong>Next anchor</strong>{template.due_at ? new Date(template.due_at).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</span><span><strong>Project</strong>{template.projects?.name || 'None'}</span></div>
      <div className="form-actions"><button className="secondary-button compact-button" disabled={Boolean(template.archived_at) || workingId === template.id} onClick={() => void runNow(template)}><RefreshCcw size={14}/> Generate now</button><button className="text-button" disabled={workingId === template.id} onClick={() => void toggleArchived(template)}>{template.archived_at ? <><RotateCcw size={14}/> Resume</> : <><Archive size={14}/> Pause</>}</button></div>
    </article>)}{!visible.length && <div className="panel empty-state">No recurring templates yet. Create one from My Tasks.</div>}</section>
  </div>
}
