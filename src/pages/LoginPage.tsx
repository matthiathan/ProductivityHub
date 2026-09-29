import { type FormEvent, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function LoginPage() {
  const { configured, session, signIn, requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const location = useLocation()

  if (session) return <Navigate to="/" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(await signIn(email, password))
    setSubmitting(false)
  }

  async function sendReset() {
    setError(null)
    setResetSent(false)
    if (!email) {
      setError('Enter your email address first.')
      return
    }
    setSubmitting(true)
    const result = await requestPasswordReset(email)
    setSubmitting(false)
    if (result) setError(result)
    else setResetSent(true)
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-mark">P</div>
        <p className="eyebrow">PRIVATE WORKSPACE</p>
        <h1>Productivity Hub</h1>
        <p className="muted">Tasks, focus, goals and productivity in one place.</p>
        {!configured && <div className="setup-banner">Supabase connection pending. The UI is currently running in local preview mode.</div>}
        <form onSubmit={submit}>
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          {error && <p className="form-error">{error}</p>}
          {resetSent && <p className="form-success">Password reset email sent.</p>}
          <button className="primary-button" disabled={submitting || !configured}>{submitting ? 'Working…' : 'Sign in'}</button>
          <button type="button" className="text-button" onClick={sendReset} disabled={submitting || !configured}>Forgot password?</button>
        </form>
        <small>{location.state ? 'Please sign in to continue.' : 'Persistent sessions are enabled on trusted devices.'}</small>
      </section>
    </main>
  )
}
