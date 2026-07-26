import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

const DustContext = createContext(null)
const STORAGE_KEY = 'pathfinder-dust-messages'

function loadMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveMessages(messages) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-80)))
  } catch {
    /* ignore quota */
  }
}

function introFor(profile) {
  const sparse =
    !profile?.onboarding_complete &&
    !(profile?.interest_tags?.length || profile?.desired_types?.length || profile?.location)
  return sparse
    ? "Describe yourself in plain language — for example “I'm a biology graduate in Meru, looking for research fellowships.” I'll propose a full profile; nothing is saved until you confirm."
    : "Tell me what to change — a new tag, a type to turn on, or a location update. I'll propose it; nothing is saved until you confirm."
}

/** Dust workspace state — messages persist; askDust navigates to /dust. */
export function DustProvider({ children }) {
  const { isAuthenticated, profile } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [pendingAsk, setPendingAsk] = useState(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      setMessages([])
      setHydrated(true)
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
      return
    }
    const stored = loadMessages()
    if (stored.length) {
      setMessages(stored)
    } else {
      setMessages([
        {
          id: 'intro',
          role: 'dust',
          status: 'open',
          text: introFor(profile),
        },
      ])
    }
    setHydrated(true)
  }, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return
    saveMessages(messages)
  }, [messages, hydrated, isAuthenticated])

  const setMessagesSafe = useCallback((updater) => {
    setMessages(updater)
  }, [])

  const askDust = useCallback(
    (text) => {
      const q = (text || '').trim()
      if (q) setPendingAsk(q)
      navigate('/dust')
    },
    [navigate],
  )

  const consumePendingAsk = useCallback(() => {
    const q = pendingAsk
    setPendingAsk(null)
    return q
  }, [pendingAsk])

  const resetDust = useCallback(() => {
    const next = [
      {
        id: `intro-${Date.now()}`,
        role: 'dust',
        status: 'open',
        text: introFor(profile),
      },
    ]
    setMessages(next)
    saveMessages(next)
  }, [profile])

  const value = useMemo(
    () => ({
      messages,
      setMessages: setMessagesSafe,
      askDust,
      openDust: () => askDust(''),
      consumePendingAsk,
      pendingAsk,
      resetDust,
    }),
    [messages, setMessagesSafe, askDust, consumePendingAsk, pendingAsk, resetDust],
  )

  return <DustContext.Provider value={value}>{children}</DustContext.Provider>
}

export function useDust() {
  const ctx = useContext(DustContext)
  if (!ctx) throw new Error('useDust must be used within DustProvider')
  return ctx
}
