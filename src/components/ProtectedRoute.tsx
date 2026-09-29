import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { configured, loading, session } = useAuth()
  if (loading) return <div className="loading-screen">Loading Productivity Hub…</div>
  if (!configured) return children
  if (!session) return <Navigate to="/login" replace />
  return children
}
