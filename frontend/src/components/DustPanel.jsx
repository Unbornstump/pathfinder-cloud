import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Send, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { typeMeta } from '../lib/utils'
import DustAvatar from './DustAvatar'

const DUST_COLORS = ['#D9A756', '#B5624A', '#6E8259', '#3654A6']
const CLOSE_MS = 520

function buildParticles(origin, center) {
  return Array.from({ length: 18 }, (_, i) => {
    const jitterX = (Math.random() - 0.5) * 110
    const jitterY = (Math.random() - 0.5) * 110
    return {
      id: i,
      dx: origin.x - center.x + jitterX,
      dy: origin.y - center.y + jitterY,
      delay: (Math.random() * 0.45).toFixed(2),
      duration: (0.85 + Math.random() * 0.55).toFixed(2),
      size: 3 + Math.random() * 5,
      color: DUST_COLORS[i % DUST_COLORS.length],
      arc: (Math.random() - 0.5) * 60,
    }
  })
}

/**
 * Dust — trail-style conversation. Proposes; never writes without confirm.
 * Opens as a centered ink panel with mote trail from the rail trigger.
 * Actions under a proposal: exactly two — apply / adjust first.
 */
export default function DustPanel({ open, onClose }) {
  const { profile, updateProfile, refreshMatches } = useAuth()
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState([])
  const [visible, setVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [origin, setOrigin] = useState({ x: 56, y: 520 })
  const [center, setCenter] = useState({ x: 590, y: 372 })
  const [particleKey, setParticleKey] = useState(0)
  const bottomRef = useRef(null)
  const seeded = useRef(false)
  const closeTimer = useRef(null)

  const particles = useMemo(
    () => buildParticles(origin, center),
    // regenerate on each open (particleKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [particleKey],
  )

  const dir = isClosing ? 'reverse' : 'normal'

  function measureGeometry() {
    const trigger =
      document.querySelector('[data-dust-trigger]') ||
      document.querySelector('[aria-label="Ask Dust"]')
    const vw = window.innerWidth
    const vh = window.innerHeight
    const nextCenter = { x: vw / 2, y: vh / 2 }
    let nextOrigin = { x: 56, y: vh * 0.72 }
    if (trigger) {
      const r = trigger.getBoundingClientRect()
      nextOrigin = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }
    setOrigin(nextOrigin)
    setCenter(nextCenter)
    setParticleKey((k) => k + 1)
  }

  function requestClose() {
    if (!visible || isClosing) return
    onClose()
  }

  useEffect(() => {
    if (open) {
      clearTimeout(closeTimer.current)
      measureGeometry()
      setIsClosing(false)
      setVisible(true)
      return undefined
    }
    if (!visible) return undefined
    setIsClosing(true)
    closeTimer.current = setTimeout(() => {
      setVisible(false)
      setIsClosing(false)
    }, CLOSE_MS)
    return () => clearTimeout(closeTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!visible || isClosing) {
      seeded.current = false
      return
    }
    if (seeded.current) return
    seeded.current = true
    const sparse =
      !profile?.onboarding_complete &&
      !(profile?.interest_tags?.length || profile?.desired_types?.length || profile?.location)
    setMessages([
      {
        id: 'intro',
        role: 'dust',
        status: 'open',
        text: sparse
          ? "Describe yourself in plain language — for example “I'm a biology graduate in Meru, looking for research fellowships.” I'll propose a full profile; nothing is saved until you confirm."
          : "Tell me what to change — a new tag, a type to turn on, or a location update. I'll propose it; nothing is saved until you confirm.",
      },
    ])
  }, [visible, isClosing, profile])

  useEffect(() => {
    if (visible && !isClosing) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, visible, isClosing])

  if (!visible) return null

  async function send() {
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    setMessages((m) => [
      ...m,
      { id: `u-${Date.now()}`, role: 'user', status: 'open', text },
    ])
    setBusy(true)
    try {
      const data = await api('/profile/dust/', { method: 'POST', body: { message: text } })
      setMessages((m) => [
        ...m,
        {
          id: `d-${Date.now()}`,
          role: 'dust',
          status: 'open',
          text: data.reply,
          suggestions: data.suggestions,
          mode: data.mode,
        },
      ])
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          id: `e-${Date.now()}`,
          role: 'dust',
          status: 'open',
          text: err.message || "Dust couldn't respond just now.",
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  async function applySuggestions(msg) {
    const suggestions = msg.suggestions
    if (!suggestions || !profile) return
    setBusy(true)
    try {
      const patch = suggestions.profile_patch
      let payload

      if (patch && (msg.mode === 'build' || Object.keys(patch).length)) {
        const tags = [...(profile.interest_tags || [])]
        for (const t of suggestions.add_tags || patch.interest_tags || []) {
          if (!tags.map((x) => x.toLowerCase()).includes(String(t).toLowerCase())) tags.push(t)
        }
        const types = [...(profile.desired_types || [])]
        for (const t of suggestions.enable_types || patch.desired_types || []) {
          if (!types.includes(t)) types.push(t)
        }
        payload = {
          location: patch.location || profile.location || '',
          education_level: patch.education_level || profile.education_level || '',
          interest_tags: patch.interest_tags?.length ? tags : tags,
          desired_types: patch.desired_types?.length
            ? [...new Set([...types, ...patch.desired_types])]
            : types,
          onboarding_complete: true,
        }
        if (patch.location) payload.location = patch.location
        if (patch.education_level) payload.education_level = patch.education_level
        if (patch.interest_tags) {
          payload.interest_tags = [
            ...new Set([...(profile.interest_tags || []), ...patch.interest_tags]),
          ]
        }
        if (patch.desired_types) {
          payload.desired_types = [
            ...new Set([...(profile.desired_types || []), ...patch.desired_types]),
          ]
        }
      } else {
        const tags = [...(profile.interest_tags || [])]
        for (const t of suggestions.add_tags || []) {
          if (!tags.map((x) => x.toLowerCase()).includes(t.toLowerCase())) tags.push(t)
        }
        const types = [...(profile.desired_types || [])]
        for (const t of suggestions.enable_types || []) {
          if (!types.includes(t)) types.push(t)
        }
        const disable = new Set(suggestions.disable_types || [])
        payload = {
          interest_tags: tags,
          desired_types: types.filter((t) => !disable.has(t)),
        }
      }

      await updateProfile(payload)
      await refreshMatches()
      setMessages((m) =>
        m.map((item) =>
          item.id === msg.id ? { ...item, status: 'confirmed' } : item,
        ),
      )
      setMessages((m) => [
        ...m,
        {
          id: `ok-${Date.now()}`,
          role: 'dust',
          status: 'confirmed',
          text: 'Applied. Your trail is updated.',
        },
      ])
      if (!profile.onboarding_complete) {
        requestClose()
        navigate('/matches', { replace: true })
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          id: `fail-${Date.now()}`,
          role: 'dust',
          status: 'open',
          text: err.message || 'Could not apply those changes.',
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  function hasProposal(msg) {
    const s = msg.suggestions
    if (!s) return false
    return Boolean(
      (s.add_tags || []).length ||
        (s.enable_types || []).length ||
        (s.profile_patch &&
          (s.profile_patch.location ||
            s.profile_patch.education_level ||
            (s.profile_patch.interest_tags || []).length ||
            (s.profile_patch.desired_types || []).length)),
    )
  }

  const trailPath = `M ${origin.x} ${origin.y} Q ${(origin.x + center.x) / 2 - 40} ${origin.y - 120} ${center.x} ${center.y}`

  return (
    <>
      <button
        type="button"
        className="dust-backdrop fixed inset-0 z-40 border-0 bg-[rgba(30,36,32,0.38)]"
        style={{ animationDirection: dir }}
        aria-label="Close Dust backdrop"
        onClick={requestClose}
      />

      <svg
        className="pointer-events-none fixed inset-0 z-[45] h-full w-full"
        aria-hidden="true"
      >
        <path
          className="dust-trail"
          d={trailPath}
          fill="none"
          stroke="#D9A756"
          strokeWidth="2"
          strokeLinecap="round"
          pathLength="1"
          strokeDasharray="1"
          style={{ animationDirection: dir }}
        />
      </svg>

      <div className="pointer-events-none fixed inset-0 z-[46]" aria-hidden="true">
        {particles.map((p) => (
          <span
            key={`${particleKey}-${p.id}`}
            className="dust-mote absolute rounded-full"
            style={{
              left: center.x,
              top: center.y,
              width: p.size,
              height: p.size,
              background: p.color,
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
              '--ax': `${p.arc}px`,
              '--ay': `${p.arc / 2}px`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              animationDirection: dir,
            }}
          />
        ))}
      </div>

      <aside
        className="dust-panel fixed left-1/2 top-1/2 z-50 flex max-h-[min(85vh,640px)] w-[min(440px,92vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-dust-panel shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
        style={{ animationDirection: dir }}
        role="dialog"
        aria-label="Dust"
        aria-modal="true"
      >
        <header className="flex items-center justify-between border-b border-dust-panel-border px-5 py-[18px]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-dust-panel-elevated">
              <DustAvatar size={17} />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold leading-none text-dust-bone">
                Dust
              </h2>
              <p className="font-mono mt-1 text-[10.5px] tracking-[0.03em] text-dust-moss">
                TRACES ON YOUR TRAIL
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="p-1 text-label hover:text-dust-bone"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="relative flex-1 overflow-y-auto px-5 py-5">
          <div className="trail-line trail-line-gold absolute bottom-4 left-[23px] top-4 opacity-40" />
          <ul className="relative space-y-5">
            {messages.map((msg, i) => (
              <li
                key={msg.id}
                className="ease-rise relative flex gap-3 pl-1"
                style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
              >
                <span
                  className={`waypoint-marker relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                    msg.status === 'confirmed'
                      ? 'border-dust-moss bg-dust-moss text-dust-bone'
                      : msg.role === 'user'
                        ? 'border-teal bg-teal'
                        : 'border-trail-gold/50 bg-dust-panel-elevated'
                  }`}
                >
                  {msg.status === 'confirmed' ? (
                    <Check size={12} className="ease-rise" />
                  ) : msg.role === 'dust' ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-trail-gold" />
                  ) : null}
                </span>
                <div className="min-w-0 flex-1 pb-1">
                  <p className="text-sm leading-relaxed text-[#DAD8CE]">{msg.text}</p>
                  {hasProposal(msg) && msg.status !== 'confirmed' && (
                    <div className="mt-3 space-y-2">
                      {(msg.suggestions?.add_tags || []).length > 0 && (
                        <p className="text-xs text-label">
                          Tags: {msg.suggestions.add_tags.join(', ')}
                        </p>
                      )}
                      {(msg.suggestions?.enable_types || []).length > 0 && (
                        <p className="text-xs text-label">
                          Types:{' '}
                          {msg.suggestions.enable_types.map((t) => typeMeta(t).short).join(', ')}
                        </p>
                      )}
                      {msg.suggestions?.profile_patch?.location && (
                        <p className="text-xs text-label">
                          Location: {msg.suggestions.profile_patch.location}
                        </p>
                      )}
                      {msg.suggestions?.profile_patch?.education_level && (
                        <p className="text-xs text-label">
                          Education: {msg.suggestions.profile_patch.education_level}
                        </p>
                      )}
                      <div className="flex gap-4 pt-1">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => applySuggestions(msg)}
                          className="text-sm font-medium text-trail-gold hover:brightness-110 disabled:opacity-60"
                        >
                          Apply this
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setMessages((m) => [
                              ...m,
                              {
                                id: `adj-${Date.now()}`,
                                role: 'dust',
                                status: 'open',
                                text: 'Tell me what to adjust and I’ll propose again.',
                              },
                            ])
                          }
                          className="text-sm text-label hover:text-dust-bone"
                        >
                          Adjust first
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div ref={bottomRef} />
        </div>

        <form
          className="flex gap-2.5 border-t border-dust-panel-border p-4"
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
        >
          <input
            className="flex-1 rounded-[10px] border border-dust-panel-border bg-dust-panel-elevated px-3 py-2.5 text-[13.5px] text-dust-bone outline-none placeholder:text-label focus:border-trail-gold"
            placeholder="Ask Dust to update your trail…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-trail-gold text-dust-panel hover:brightness-105 disabled:opacity-50"
            aria-label="Send"
          >
            <Send size={15} />
          </button>
        </form>
      </aside>
    </>
  )
}
