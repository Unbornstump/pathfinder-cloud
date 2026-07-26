import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, getAccessToken, refreshAccessToken, setAccessToken } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [booting, setBooting] = useState(true)
  const [access, setAccess] = useState(null)
  const [profile, setProfile] = useState(null)
  const [matches, setMatches] = useState(null)
  const [trending, setTrending] = useState([])
  const [ingestionMeta, setIngestionMeta] = useState({ last_scraped_at: null, live_count: 0 })
  const [moves, setMoves] = useState([])
  const [notifications, setNotifications] = useState([])
  const [config, setConfig] = useState({ google_enabled: false, google_client_id: null })

  const applyAccess = useCallback((token) => {
    setAccessToken(token)
    setAccess(token)
  }, [])

  const loadAuthedData = useCallback(async () => {
    const [prof, matched, movesData, notes, trend, ingest] = await Promise.all([
      api('/profile/'),
      api('/matches/'),
      api('/moves/'),
      api('/notifications/'),
      api('/opportunities/trending/').catch(() => []),
      api('/ingestion/status/').catch(() => ({ last_scraped_at: null, live_count: 0 })),
    ])
    setProfile(prof)
    setMatches(matched)
    setMoves(movesData)
    setNotifications(notes)
    setTrending(Array.isArray(trend) ? trend : [])
    setIngestionMeta(ingest || { last_scraped_at: null, live_count: 0 })
    return { profile: prof, matches: matched, moves: movesData, notifications: notes }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function boot() {
      setBooting(true)
      try {
        const cfg = await api('/config/')
        if (!cancelled) setConfig(cfg)
      } catch {
        if (!cancelled) setConfig({ google_enabled: false, google_client_id: null })
      }

      try {
        await refreshAccessToken()
        if (cancelled) return
        applyAccess(getAccessToken())
        await loadAuthedData()
      } catch {
        if (!cancelled) {
          applyAccess(null)
          setProfile(null)
          setMatches(null)
          setTrending([])
          setIngestionMeta({ last_scraped_at: null, live_count: 0 })
          setMoves([])
          setNotifications([])
        }
      } finally {
        if (!cancelled) setBooting(false)
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [applyAccess, loadAuthedData])

  const login = useCallback(
    async (username, password) => {
      const data = await api('/token/', {
        method: 'POST',
        body: { username, password },
      })
      applyAccess(data.access)
      await loadAuthedData()
      return data
    },
    [applyAccess, loadAuthedData],
  )

  const register = useCallback(
    async ({ username, email, password }) => {
      const data = await api('/auth/register/', {
        method: 'POST',
        body: { username, email, password },
      })
      applyAccess(data.access)
      await loadAuthedData()
      return data
    },
    [applyAccess, loadAuthedData],
  )

  const loginWithGoogle = useCallback(
    async (credential) => {
      const data = await api('/auth/google/', {
        method: 'POST',
        body: { credential },
      })
      applyAccess(data.access)
      await loadAuthedData()
      return data
    },
    [applyAccess, loadAuthedData],
  )

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout/', { method: 'POST' })
    } catch {
      /* ignore */
    }
    applyAccess(null)
    setProfile(null)
    setMatches(null)
    setMoves([])
    setNotifications([])
  }, [applyAccess])

  const updateProfile = useCallback(async (payload) => {
    const prof = await api('/profile/', { method: 'PUT', body: payload })
    setProfile(prof)
    return prof
  }, [])

  const refreshMatches = useCallback(async () => {
    const [matched, movesData, trend, ingest] = await Promise.all([
      api('/matches/'),
      api('/moves/'),
      api('/opportunities/trending/').catch(() => []),
      api('/ingestion/status/').catch(() => ({ last_scraped_at: null, live_count: 0 })),
    ])
    setMatches(matched)
    setMoves(movesData)
    setTrending(Array.isArray(trend) ? trend : [])
    setIngestionMeta(ingest || { last_scraped_at: null, live_count: 0 })
    return matched
  }, [])

  const SWEEP_LINES = useMemo(
    () => [
      'Sweeping new matches…',
      'Filtering against your trail…',
      'Resettling your trail…',
      'Dust is settling on new listings…',
    ],
    [],
  )

  const [trailSweep, setTrailSweep] = useState(null)

  /** Save profile + rematch with a visible dust-themed working state (min ~1.8s). */
  const saveProfileAndResweep = useCallback(
    async (payload) => {
      const line = SWEEP_LINES[Math.floor(Math.random() * SWEEP_LINES.length)]
      setTrailSweep({ line, startedAt: Date.now() })
      const minWait = new Promise((r) => setTimeout(r, 1800))
      try {
        const prof = await updateProfile(payload)
        await Promise.all([refreshMatches(), minWait])
        return prof
      } finally {
        setTrailSweep(null)
      }
    },
    [SWEEP_LINES, updateProfile, refreshMatches],
  )

  const refreshNotifications = useCallback(async () => {
    const notes = await api('/notifications/')
    setNotifications(notes)
    return notes
  }, [])

  const saveOpportunity = useCallback(async (id) => {
    const result = await api(`/opportunities/${id}/save/`, { method: 'POST' })
    setMatches((prev) =>
      (prev || []).map((o) => (o.id === id ? { ...o, match_state: result.state } : o)),
    )
    return result
  }, [])

  const dismissOpportunity = useCallback(async (id) => {
    const result = await api(`/opportunities/${id}/dismiss/`, { method: 'POST' })
    setMatches((prev) => (prev || []).filter((o) => o.id !== id))
    return result
  }, [])

  const markNotificationRead = useCallback(async (id) => {
    const note = await api(`/notifications/${id}/read/`, { method: 'POST' })
    setNotifications((prev) => prev.map((n) => (n.id === id ? note : n)))
    return note
  }, [])

  const value = useMemo(
    () => ({
      booting,
      access,
      isAuthenticated: Boolean(access),
      profile,
      matches,
      trending,
      ingestionMeta,
      moves,
      notifications,
      config,
      login,
      register,
      loginWithGoogle,
      logout,
      updateProfile,
      saveProfileAndResweep,
      trailSweep,
      refreshMatches,
      refreshNotifications,
      saveOpportunity,
      dismissOpportunity,
      markNotificationRead,
    }),
    [
      booting,
      access,
      profile,
      matches,
      trending,
      ingestionMeta,
      moves,
      notifications,
      config,
      login,
      register,
      loginWithGoogle,
      logout,
      updateProfile,
      saveProfileAndResweep,
      trailSweep,
      refreshMatches,
      refreshNotifications,
      saveOpportunity,
      dismissOpportunity,
      markNotificationRead,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
