import { CalendarDays, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listCalendarItems, type CalendarItem } from '../lib/calendar'
import '../styles/pagePolish.css'

type ViewMode = 'month' | 'week' | 'agenda'
type Range = 'today' | '7' | '30' | 'all'
type TypeFilter = 'all' | CalendarItem['type']

function dateKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function startOfWeek(date: Date) {
  const result = new Date(date)
  const day = (result.getDay() + 6) % 7
  result.setDate(result.getDate() - day)
  result.setHours(0, 0, 0, 0)
  return result
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function openRoute(item: CalendarItem) {
  const encoded = encodeURIComponent(item.id)
  if (item.type === 'task') return `/tasks?open=${encoded}`
  if (item.type === 'project') return `/projects?open=${encoded}`
  return `/goals?open=${encoded}`
}

export function CalendarPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<CalendarItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>('month')
  const [range, setRange] = useState<Range>('30')
  const [type, setType] = useState<TypeFilter>('all')
  const [anchor, setAnchor] = useState(() => new Date())

  useEffect(() => { void listCalendarItems().then(setItems).catch(e => setError(e instanceof Error ? e.message : 'Could not load calendar.')) }, [])

  const typedItems = useMemo(() => items.filter(item => type === 'all' || item.type === type), [items, type])
  const itemsByDate = useMemo(() => typedItems.reduce<Record<string, CalendarItem[]>>((acc, item) => { (acc[item.date] ??= []).push(item); return acc }, {}), [typedItems])

  const agendaItems = useMemo(() => {
    const today = new Date()
    const todayKey = dateKey(today)
    const cutoff = new Date(today)
    if (range !== 'all' && range !== 'today') cutoff.setDate(cutoff.getDate() + Number(range))
    const cutoffKey = dateKey(cutoff)
    return typedItems.filter(item => {
      if (range === 'all') return true
      if (range === 'today') return item.date === todayKey
      return item.date >= todayKey && item.date <= cutoffKey
    })
  }, [typedItems, range])

  const agendaGrouped = useMemo(() => Object.entries(agendaItems.reduce<Record<string, CalendarItem[]>>((acc, item) => { (acc[item.date] ??= []).push(item); return acc }, {})), [agendaItems])
  const overdueCount = items.filter(item => item.type === 'task' && item.status !== 'done' && item.date < dateKey(new Date())).length

  const monthDays = useMemo(() => {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    const gridStart = startOfWeek(first)
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
  }, [anchor])

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchor)
    return Array.from({ length: 7 }, (_, index) => addDays(start, index))
  }, [anchor])

  function move(direction: -1 | 1) {
    setAnchor(current => {
      const next = new Date(current)
      if (view === 'month') next.setMonth(next.getMonth() + direction)
      else next.setDate(next.getDate() + 7 * direction)
      return next
    })
  }

  const periodTitle = view === 'month'
    ? anchor.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
    : `${weekDays[0].toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })} – ${weekDays[6].toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}`

  return <div>
    <header className="page-heading"><div><p className="eyebrow">CALENDAR</p><h1>Calendar</h1><p className="muted">Deadlines across tasks, projects, and goals.</p></div><div className="calendar-view-switch">{(['month','week','agenda'] as ViewMode[]).map(mode => <button key={mode} className={view === mode ? 'toolbar-pill active' : 'toolbar-pill'} onClick={() => setView(mode)}>{mode[0].toUpperCase()+mode.slice(1)}</button>)}</div></header>
    {error && <div className="error-banner">{error}</div>}

    <section className="calendar-toolbar panel">
      {view !== 'agenda' && <div className="calendar-period-nav"><button className="icon-button" onClick={() => move(-1)} aria-label="Previous period"><ChevronLeft size={17}/></button><button className="secondary-button compact-button" onClick={() => setAnchor(new Date())}>Today</button><strong>{periodTitle}</strong><button className="icon-button" onClick={() => move(1)} aria-label="Next period"><ChevronRight size={17}/></button></div>}
      {view === 'agenda' && <div className="toolbar-group"><Filter size={16}/><strong>Show</strong>{(['today','7','30','all'] as Range[]).map(value => <button key={value} className={range === value ? 'toolbar-pill active' : 'toolbar-pill'} onClick={() => setRange(value)}>{value === 'today' ? 'Today' : value === 'all' ? 'All dates' : `Next ${value} days`}</button>)}</div>}
      <div className="toolbar-group">{(['all','task','project','goal'] as TypeFilter[]).map(value => <button key={value} className={type === value ? 'toolbar-pill active' : 'toolbar-pill'} onClick={() => setType(value)}>{value[0].toUpperCase()+value.slice(1)}</button>)}</div>
      <div className="calendar-summary"><span>{typedItems.length} total item{typedItems.length === 1 ? '' : 's'}</span>{overdueCount > 0 && <span className="overdue-summary">{overdueCount} overdue task{overdueCount === 1 ? '' : 's'}</span>}</div>
    </section>

    {view === 'month' && <section className="panel month-calendar"><div className="calendar-weekdays">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => <span key={day}>{day}</span>)}</div><div className="month-calendar-grid">{monthDays.map(day => {
      const key = dateKey(day)
      const rows = itemsByDate[key] ?? []
      const currentMonth = day.getMonth() === anchor.getMonth()
      const today = key === dateKey(new Date())
      return <div key={key} className={`month-day ${currentMonth ? '' : 'outside-month'} ${today ? 'today' : ''}`}><div className="month-day-number"><span>{day.getDate()}</span>{rows.length > 0 && <small>{rows.length}</small>}</div><div className="month-events">{rows.slice(0,3).map(row => <button key={`${row.type}-${row.id}`} className={`calendar-event ${row.type}`} onClick={() => navigate(openRoute(row))}><span>{row.title}</span></button>)}{rows.length > 3 && <small className="more-events">+{rows.length-3} more</small>}</div></div>
    })}</div></section>}

    {view === 'week' && <section className="week-calendar">{weekDays.map(day => {
      const key = dateKey(day)
      const rows = itemsByDate[key] ?? []
      const today = key === dateKey(new Date())
      return <article className={`panel week-day ${today ? 'today' : ''}`} key={key}><div className="week-day-head"><span>{day.toLocaleDateString('en-ZA',{weekday:'short'})}</span><strong>{day.getDate()}</strong></div><div className="week-events">{rows.map(row => <button key={`${row.type}-${row.id}`} className={`calendar-week-event ${row.type}`} onClick={() => navigate(openRoute(row))}><span className={`calendar-type ${row.type}`}>{row.type}</span><strong>{row.title}</strong><small>{row.status.replaceAll('_',' ')}</small></button>)}{!rows.length && <span className="week-empty">No deadlines</span>}</div></article>
    })}</section>}

    {view === 'agenda' && <section className="calendar-list">{agendaGrouped.map(([date, rows]) => {
      const overdue = date < dateKey(new Date())
      return <article className={`panel calendar-day ${overdue ? 'calendar-day-overdue' : ''}`} key={date}>
        <div className="calendar-date"><CalendarDays size={18}/><div><strong>{new Date(`${date}T00:00:00`).toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</strong><span>{rows.length} item{rows.length===1?'':'s'}</span></div></div>
        <div>{rows.map(row => <button className="calendar-item calendar-item-button" key={`${row.type}-${row.id}`} onClick={() => navigate(openRoute(row))}><span className={`calendar-type ${row.type}`}>{row.type}</span><strong>{row.title}</strong><small>{row.status.replaceAll('_',' ')}</small></button>)}</div>
      </article>
    })}{!agendaGrouped.length && <div className="panel empty-state">No calendar items match these filters.</div>}</section>}
  </div>
}
