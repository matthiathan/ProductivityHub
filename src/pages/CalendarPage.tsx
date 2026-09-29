import { CalendarDays } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { listCalendarItems, type CalendarItem } from '../lib/calendar'

export function CalendarPage() {
  const [items,setItems]=useState<CalendarItem[]>([]); const [error,setError]=useState<string|null>(null)
  useEffect(()=>{void listCalendarItems().then(setItems).catch(e=>setError(e instanceof Error?e.message:'Could not load calendar.'))},[])
  const grouped=useMemo(()=>Object.entries(items.reduce<Record<string,CalendarItem[]>>((acc,item)=>{(acc[item.date]??=[]).push(item);return acc},{})),[items])
  return <div><header className="page-heading"><div><p className="eyebrow">CALENDAR</p><h1>Calendar</h1><p className="muted">Deadlines across tasks, projects, and goals.</p></div></header>{error&&<div className="error-banner">{error}</div>}<section className="calendar-list">{grouped.map(([date,rows])=><article className="panel calendar-day" key={date}><div className="calendar-date"><CalendarDays size={18}/><div><strong>{new Date(`${date}T00:00:00`).toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long'})}</strong><span>{rows.length} item{rows.length===1?'':'s'}</span></div></div><div>{rows.map(row=><div className="calendar-item" key={`${row.type}-${row.id}`}><span className={`calendar-type ${row.type}`}>{row.type}</span><strong>{row.title}</strong><small>{row.status}</small></div>)}</div></article>)}{!grouped.length&&<div className="empty-state">No dated items yet.</div>}</section></div>
}
