import { CalendarDays, Filter } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { listCalendarItems, type CalendarItem } from '../lib/calendar'
import '../styles/pagePolish.css'

type Range = 'today' | '7' | '30' | 'all'
type TypeFilter = 'all' | CalendarItem['type']

function dateKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function CalendarPage() {
  const [items, setItems] = useState<CalendarItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<Range>('30')
  const [type, setType] = useState<TypeFilter>('all')

  useEffect(() => { void listCalendarItems().then(setItems).catch(e => setError(e instanceof Error ? e.message : 'Could not load calendar.')) }, [])

  const filtered = useMemo(() => {
    const today = new Date()
    const todayKey = dateKey(today)
    const cutoff = new Date(today)
    if (range !== 'all' && range !== 'today') cutoff.setDate(cutoff.getDate() + Number(range))
    const cutoffKey = dateKey(cutoff)
    return items.filter(item => {
      const typeMatch = type === 'all' || item.type === type
      if (!typeMatch) return false
      if (range === 'all') return true
      if (range === 'today') return item.date === todayKey
      return item.date >= todayKey && item.date <= cutoffKey
    })
  }, [items, range, type])

  const grouped = useMemo(() => Object.entries(filtered.reduce<Record<string, CalendarItem[]>>((acc, item) => { (acc[item.date] ??= []).push(item); return acc }, {})), [filtered])
  const overdueCount = items.filter(item => item.type === 'task' && item.status !== 'done' && item.date < dateKey(new Date())).length

  return <div>
    <header className="page-heading"><div><p className="eyebrow">CALENDAR</p><h1>Calendar</h1><p className="muted">Deadlines across tasks, projects, and goals.</p></div></header>
    {error && <div className="error-banner">{error}</div>}
    <section className="calendar-toolbar panel">
      <div className="toolbar-group"><Filter size={16}/><strong>Show</strong>{(['today','7','30','all'] as Range[]).map(value => <button key={value} className={range === value ? 'toolbar-pill active' : 'toolbar-pill'} onClick={() => setRange(value)}>{value === 'today' ? 'Today' : value === 'all' ? 'All dates' : `Next ${value} days`}</button>)}</div>
      <div className="toolbar-group">{(['all','task','project','goal'] as TypeFilter[]).map(value => <button key={value} className={type === value ? 'toolbar-pill active' : 'toolbar-pill'} onClick={() => setType(value)}>{value[0].toUpperCase()+value.slice(1)}</button>)}</div>
      <div className="calendar-summary"><span>{filtered.length} visible</span>{overdueCount > 0 && <span className="overdue-summary">{overdueCount} overdue task{overdueCount === 1 ? '' : 's'}</span>}</div>
    </section>
    <section className="calendar-list">{grouped.map(([date, rows]) => {
      const overdue = date < dateKey(new Date())
      return <article className={`panel calendar-day ${overdue ? 'calendar-day-overdue' : ''}`} key={date}>
        <div className="calendar-date"><CalendarDays size={18}/><div><strong>{new Date(`${date}T00:00:00`).toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</strong><span>{rows.length} item{rows.length===1?'':'s'}</span></div></div>
        <div>{rows.map(row => <div className="calendar-item" key={`${row.type}-${row.id}`}><span className={`calendar-type ${row.type}`}>{row.type}</span><strong>{row.title}</strong><small>{row.status.replaceAll('_',' ')}</small></div>)}</div>
      </article>
    })}{!grouped.length && <div className="panel empty-state">No calendar items match these filters.</div>}</section>
  </div>
}
