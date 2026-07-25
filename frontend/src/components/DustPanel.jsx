import { useEffect, useRef, useState } from 'react'
import { Check, Send, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { typeMeta } from '../lib/utils'
import DustAvatar from './DustAvatar'

/**
 * Dust — trail-style conversation. Proposes; never writes without confirm.
 * Actions under a proposal: exactly two — apply / adjust first.
 */
export default function DustPanel({ open, onClose }) {
  const { profile, updateProfile, refreshMatches } = useAuth()
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState([])
  const bottomRef = useRef(null)
  const seeded = useRef(false)

  useEffect(() => {
    if (!open) {
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
  }, [open, profile])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  if (!open) return null

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
        onClose()
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

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-ink/25"
        aria-label="Close Dust backdrop"
        onClick={onClose}
      />
      <aside
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-[12px] border border-border bg-card md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[400px] md:rounded-none md:border-l md:border-t-0"
        role="dialog"
        aria-label="Dust"
      >
        <header className="flex items-start gap-3 border-b border-border px-4 py-3">
          <DustAvatar size={32} />
          <div className="min-w-0 flex-1">
            <h2 className="text-base text-ink">Dust</h2>
            <p className="text-xs text-muted">Traces on your trail</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink" aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="relative flex-1 overflow-y-auto px-4 py-4">
          <div className="trail-line absolute bottom-4 left-[23px] top-4" />
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
                      ? 'border-experiential bg-experiential text-white'
                      : msg.role === 'user'
                        ? 'border-teal bg-teal'
                        : 'border-trail bg-page'
                  }`}
                >
                  {msg.status === 'confirmed' ? (
                    <Check size={12} className="ease-rise" />
                  ) : null}
                </span>
                <div className="min-w-0 flex-1 pb-1">
                  <p className="text-sm leading-relaxed text-ink">{msg.text}</p>
                  {hasProposal(msg) && msg.status !== 'confirmed' && (
                    <div className="mt-3 space-y-2">
                      {(msg.suggestions?.add_tags || []).length > 0 && (
                        <p className="text-xs text-muted">
                          Tags: {msg.suggestions.add_tags.join(', ')}
                        </p>
                      )}
                      {(msg.suggestions?.enable_types || []).length > 0 && (
                        <p className="text-xs text-muted">
                          Types:{' '}
                          {msg.suggestions.enable_types.map((t) => typeMeta(t).short).join(', ')}
                        </p>
                      )}
                      {msg.suggestions?.profile_patch?.location && (
                        <p className="text-xs text-muted">
                          Location: {msg.suggestions.profile_patch.location}
                        </p>
                      )}
                      {msg.suggestions?.profile_patch?.education_level && (
                        <p className="text-xs text-muted">
                          Education: {msg.suggestions.profile_patch.education_level}
                        </p>
                      )}
                      <div className="flex gap-4 pt-1">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => applySuggestions(msg)}
                          className="text-sm font-medium text-teal hover:text-teal-dark disabled:opacity-60"
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
                          className="text-sm text-muted hover:text-ink"
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
          className="flex gap-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
        >
          <input
            className="flex-1 rounded-[8px] border border-border px-3 py-2 text-sm outline-none focus:border-teal"
            placeholder="What are you looking for?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-[8px] bg-teal px-3 py-2 text-white hover:bg-teal-dark disabled:opacity-50"
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </form>
      </aside>
    </>
  )
}
