import { Pin, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createNote, deleteNote, listNotes, updateNote, type Note } from '../lib/notes'
import { listProjects, listTasks, type Project, type Task } from '../lib/productivity'
import '../styles/pagePolish.css'

export function NotesPage() {
  const { session } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [notes, setNotes] = useState<Note[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [selected, setSelected] = useState<Note | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function reload() {
    try {
      const [noteRows, projectRows, taskRows] = await Promise.all([listNotes(), listProjects(), listTasks()])
      setNotes(noteRows)
      setProjects(projectRows.filter(project => project.status !== 'archived'))
      setTasks(taskRows)
      if (selected) setSelected(noteRows.find(note => note.id === selected.id) ?? null)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load notes.') }
  }

  useEffect(() => { void reload() }, [session?.user.id])
  useEffect(() => {
    const openId = searchParams.get('open')
    if (!openId || !notes.length) return
    const match = notes.find(note => note.id === openId)
    if (match) {
      setSelected(match)
      setSaved(false)
    }
    const next = new URLSearchParams(searchParams)
    next.delete('open')
    setSearchParams(next, { replace: true })
  }, [notes, searchParams, setSearchParams])

  const visibleNotes = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return notes
    return notes.filter(note => note.title.toLowerCase().includes(query) || note.content.toLowerCase().includes(query))
  }, [notes, search])

  async function add() {
    if (!session?.user.id) return
    try {
      const note = await createNote({ user_id: session.user.id, title: 'Untitled note' })
      setNotes(current => [note, ...current])
      setSelected(note)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create note.') }
  }

  async function save() {
    if (!selected) return
    setSaved(false)
    try {
      const updated = await updateNote(selected.id, { title: selected.title, content: selected.content, pinned: selected.pinned, task_id: selected.task_id, project_id: selected.project_id })
      setSelected(updated)
      setNotes(current => current.map(note => note.id === updated.id ? updated : note).sort((a,b) => Number(b.pinned)-Number(a.pinned) || b.updated_at.localeCompare(a.updated_at)))
      setSaved(true)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save note.') }
  }

  async function remove() {
    if (!selected || !window.confirm(`Delete “${selected.title}”?`)) return
    try {
      await deleteNote(selected.id)
      setNotes(current => current.filter(note => note.id !== selected.id))
      setSelected(null)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not delete note.') }
  }

  return <div>
    <header className="page-heading"><div><p className="eyebrow">NOTES</p><h1>Notes</h1><p className="muted">Lightweight notes linked to the work they belong to.</p></div><button className="primary-button compact" onClick={() => void add()}><Plus size={16}/> New Note</button></header>
    {error && <div className="error-banner">{error}</div>}
    <section className="notes-layout">
      <aside className="panel notes-list">
        <label className="note-search"><Search size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes…"/></label>
        {visibleNotes.map(note => <button key={note.id} className={`note-list-item ${selected?.id===note.id?'active':''}`} onClick={() => { setSelected(note); setSaved(false) }}>{note.pinned && <Pin size={13}/>}<span><strong>{note.title || 'Untitled note'}</strong><small>{new Date(note.updated_at).toLocaleDateString()}</small></span></button>)}
        {!visibleNotes.length && <div className="empty-state compact-empty">No notes found.</div>}
      </aside>
      <article className="panel note-editor">{selected ? <>
        <input className="note-title" value={selected.title} onChange={e => setSelected({...selected,title:e.target.value})}/>
        <div className="note-links"><label>Project<select value={selected.project_id ?? ''} onChange={e => setSelected({...selected, project_id:e.target.value || null})}><option value="">No project</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><label>Task<select value={selected.task_id ?? ''} onChange={e => setSelected({...selected, task_id:e.target.value || null})}><option value="">No task</option>{tasks.filter(task => !selected.project_id || task.project_id === selected.project_id).map(task => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label></div>
        <textarea value={selected.content} onChange={e => setSelected({...selected,content:e.target.value})} placeholder="Write your note…"/>
        <div className="form-actions"><button className="primary-button" onClick={() => void save()}>Save</button><button className="secondary-button" onClick={() => setSelected({...selected,pinned:!selected.pinned})}><Pin size={15}/>{selected.pinned?'Unpin':'Pin'}</button><button className="text-button danger" onClick={() => void remove()}><Trash2 size={15}/> Delete</button>{saved && <span className="form-success inline-success">Saved</span>}</div>
      </> : <div className="empty-state">Select or create a note.</div>}</article>
    </section>
  </div>
}
