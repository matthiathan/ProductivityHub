import { BarChart3, Bell, CalendarDays, CheckSquare2, Clock3, FileText, FolderKanban, Goal, LayoutDashboard, LogOut, Search, Settings } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listNotifications, markAllNotificationsRead, markNotificationRead, refreshNotifications, type Notification } from '../lib/notifications'

const nav = [
  ['/', 'Overview', LayoutDashboard], ['/tasks', 'My Tasks', CheckSquare2], ['/projects', 'Projects', FolderKanban], ['/calendar', 'Calendar', CalendarDays], ['/focus', 'Time Tracking', Clock3], ['/analytics', 'Analytics', BarChart3], ['/goals', 'Goals', Goal], ['/notes', 'Notes', FileText], ['/settings', 'Settings', Settings],
] as const

export function AppLayout() {
  const { configured, session, signOut } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)

  async function loadNotifications() {
    if (!session?.user.id) return
    try {
      await refreshNotifications()
      setNotifications(await listNotifications())
    } catch {
      // Notification refresh should never block the rest of the app shell.
    }
  }
  useEffect(() => { void loadNotifications() }, [session?.user.id])
  const unread = useMemo(() => notifications.filter((item) => !item.read_at).length, [notifications])

  async function openNotification(item: Notification) {
    if (!item.read_at) await markNotificationRead(item.id)
    setShowNotifications(false)
    if (item.entity_type === 'task') navigate('/tasks')
    if (item.entity_type === 'goal') navigate('/goals')
    if (item.entity_type === 'project') navigate('/projects')
    await loadNotifications()
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark small">P</div><div><strong>Productivity</strong><span>Hub</span></div></div>
      <nav>{nav.map(([to, label, Icon]) => <NavLink to={to} end={to === '/'} key={to} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><Icon size={18}/><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="status-chip"><span className={configured ? 'status-dot online' : 'status-dot'} />{configured ? 'Supabase connected' : 'Local preview'}</div>{configured && <button className="nav-link signout" onClick={() => void signOut()}><LogOut size={18}/>Sign out</button>}</div>
    </aside>
    <main className="main-column">
      <div className="topbar"><div className="search-box"><Search size={18}/><input aria-label="Search" placeholder="Search tasks, projects, goals…" /></div><div className="notification-wrap"><button className="icon-button" aria-label="Notifications" onClick={() => setShowNotifications(!showNotifications)}><Bell size={19}/>{unread > 0 && <span className="notification-dot"/>}</button>{showNotifications && <div className="notification-panel"><div className="notification-panel-head"><strong>Notifications</strong>{unread > 0 && <button className="text-button" onClick={() => void markAllNotificationsRead().then(loadNotifications)}>Mark all read</button>}</div><div className="notification-list">{notifications.slice(0,12).map((item) => <button className={`notification-item ${item.read_at ? '' : 'unread'}`} key={item.id} onClick={() => void openNotification(item)}><span className={`notification-kind ${item.kind}`}/><div><strong>{item.title}</strong><p>{item.body}</p><small>{new Date(item.created_at).toLocaleString('en-ZA',{dateStyle:'medium',timeStyle:'short'})}</small></div></button>)}{!notifications.length && <div className="empty-state">No notifications.</div>}</div></div>}</div><div className="profile-chip"><div className="avatar">M</div><div><strong>My Workspace</strong><span>Personal</span></div></div></div>
      <div className="content"><Outlet/></div>
    </main>
  </div>
}
