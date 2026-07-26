import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { CompassMark } from '../components/CompassMark'
import ThemeToggle from '../components/ThemeToggle'

export default function Login() {
  const { login, loginWithGoogle, config, isAuthenticated, profile, booting } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleMsg, setGoogleMsg] = useState('')
  const googleBtnRef = useRef(null)

  useEffect(() => {
    if (!booting && isAuthenticated) {
      navigate(profile?.onboarding_complete ? '/matches' : '/onboarding', { replace: true })
    }
  }, [booting, isAuthenticated, profile, navigate])

  useEffect(() => {
    if (!config.google_enabled || !config.google_client_id || !googleBtnRef.current) return

    const scriptId = 'google-gsi'
    function renderButton() {
      if (!window.google?.accounts?.id) return
      window.google.accounts.id.initialize({
        client_id: config.google_client_id,
        callback: async (response) => {
          try {
            setError('')
            await loginWithGoogle(response.credential)
            navigate('/', { replace: true })
          } catch (err) {
            setError(err.message || 'Google sign-in failed')
          }
        },
      })
      googleBtnRef.current.innerHTML = ''
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: googleBtnRef.current.offsetWidth || 320,
        text: 'continue_with',
      })
    }

    if (document.getElementById(scriptId)) {
      renderButton()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.id = scriptId
    script.onload = renderButton
    document.body.appendChild(script)
  }, [config, loginWithGoogle, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(username, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Could not sign in')
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
        <div className="mb-4 flex justify-center">
          <CompassMark size={56} />
        </div>
        <h1 className="mb-6 text-center text-2xl text-ink">Welcome back</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm text-muted">Username</span>
            <div className="field-shell flex items-center gap-2 rounded-[12px] border border-border px-3 py-2.5">
              <User size={18} className="text-muted" />
              <input
                className="w-full bg-transparent outline-none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
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
                autoComplete="current-password"
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
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-sm text-muted">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {config.google_enabled ? (
          <div ref={googleBtnRef} className="flex min-h-11 w-full justify-center" />
        ) : (
          <button
            type="button"
            onClick={() =>
              setGoogleMsg(
                'Google sign-in is not configured yet. Set GOOGLE_CLIENT_ID on the backend and VITE_GOOGLE_CLIENT_ID if needed.',
              )
            }
            className="w-full rounded-[12px] border border-border px-4 py-2.5 text-ink hover:bg-page"
          >
            Continue with Google
          </button>
        )}
        {googleMsg && <p className="mt-2 text-center text-xs text-muted">{googleMsg}</p>}

        <p className="mt-6 text-center text-sm text-muted">
          <Link to="/register" className="text-teal hover:text-teal-dark">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
