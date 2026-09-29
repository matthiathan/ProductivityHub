import { type FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function ResetPasswordPage() {
  const { configured, session, updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [complete, setComplete] = useState(false)

  if (complete) return <Navigate to="/" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage(null)
    setError(null)

    if (password.length < 8) {
      setError('Use at least 8 characters for your new password.')
      return
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }
    if (!session) {
      setError('Open this page from the password-reset link sent to your email.')
      return
    }

    setSubmitting(true)
    const result = await updatePassword(password)
    setSubmitting(false)
    if (result) {
      setError(result)
      return
    }
    setMessage('Password updated successfully.')
    window.setTimeout(() => setComplete(true), 700)
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-mark">P</div>
        <p className="eyebrow">ACCOUNT RECOVERY</p>
        <h1>Set a new password</h1>
        <p className="muted">Choose a new password for your Productivity Hub account.</p>
        {!configured && <div className="setup-banner">Supabase is not configured.</div>}
        <form onSubmit={submit}>
          <label>New password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <label>Confirm password<input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></label>
          {error && <p className="form-error">{error}</p>}
          {message && <p className="form-success">{message}</p>}
          <button className="primary-button" disabled={submitting || !configured}>{submitting ? 'Updating…' : 'Update password'}</button>
        </form>
      </section>
    </main>
  )
}
