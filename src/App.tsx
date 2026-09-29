import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const TasksPage = lazy(() => import('./pages/TasksPage').then((module) => ({ default: module.TasksPage })))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then((module) => ({ default: module.ProjectsPage })))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })))
const FocusPage = lazy(() => import('./pages/FocusPage').then((module) => ({ default: module.FocusPage })))
const GoalsPage = lazy(() => import('./pages/GoalsPage').then((module) => ({ default: module.GoalsPage })))
const CalendarPage = lazy(() => import('./pages/CalendarPage').then((module) => ({ default: module.CalendarPage })))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })))
const NotesPage = lazy(() => import('./pages/NotesPage').then((module) => ({ default: module.NotesPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))
const RecurringPage = lazy(() => import('./pages/RecurringPage').then((module) => ({ default: module.RecurringPage })))

function RouteFallback() {
  return <div className="loading-screen">Loading workspace…</div>
}

export default function App() {
  return <AuthProvider><HashRouter><Suspense fallback={<RouteFallback/>}><Routes>
    <Route path="/login" element={<LoginPage/>}/>
    <Route path="/reset-password" element={<ResetPasswordPage/>}/>
    <Route element={<ProtectedRoute><AppLayout/></ProtectedRoute>}>
      <Route index element={<DashboardPage/>}/>
      <Route path="tasks" element={<TasksPage/>}/>
      <Route path="recurring" element={<RecurringPage/>}/>
      <Route path="projects" element={<ProjectsPage/>}/>
      <Route path="calendar" element={<CalendarPage/>}/>
      <Route path="focus" element={<FocusPage/>}/>
      <Route path="analytics" element={<AnalyticsPage/>}/>
      <Route path="goals" element={<GoalsPage/>}/>
      <Route path="notes" element={<NotesPage/>}/>
      <Route path="settings" element={<SettingsPage/>}/>
    </Route>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></Suspense></HashRouter></AuthProvider>
}
