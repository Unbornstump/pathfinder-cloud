import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Mail, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/ThemeToggle'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await register({ username, email, password })
      navigate('/onboarding', { replace: true })
    } catch (err) {
      const detail = err.data
      if (detail && typeof detail === 'object') {
        const first = Object.values(detail).flat()?.[0]
        setError(typeof first === 'string' ? first : err.message)
      } else {
        setError(err.message || 'Could not create account')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-page px-4 py-10">
      <div className="absolute right-4 top-4 md:right-8 md:top-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md rounded-[12px] border border-border bg-card p-8">
        <h1 className="mb-6 text-center text-2xl text-ink">Create an account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm text-muted">Username</span>
            <div className="field-shell flex items-center gap-2 rounded-[12px] border border-border px-3 py-2.5">
              <User size={18} className="text-muted" />
              <input
                className="w-full bg-transparent outline-none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-muted">Email</span>
            <div className="field-shell flex items-center gap-2 rounded-[12px] border border-border px-3 py-2.5">
              <Mail size={18} className="text-muted" />
              <input
                type="email"
                className="w-full bg-transparent outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-muted">Password</span>
            <div className="field-shell flex items-center gap-2 rounded-[12px] border border-border px-3 py-2.5">
              <Lock size={18} className="text-muted" />
              <input
                type="password"
                className="w-full bg-transparent outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
          </label>
          {error && <p className="text-sm text-urgent">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-[12px] bg-teal px-4 py-2.5 text-white hover:bg-teal-dark disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-teal hover:text-teal-dark">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
