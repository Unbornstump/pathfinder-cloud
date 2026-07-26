import { useEffect, useRef, useState } from 'react'
import { Check, Send } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useDust } from '../context/DustContext'
import { typeMeta } from '../lib/utils'
import DustAvatar from '../components/DustAvatar'

const QUICK_ACTIONS = [
  { label: 'Find funding', prompt: 'Help me find funding or grants that fit my background.' },
  { label: 'Explain a match', prompt: 'Explain why my top matches fit me, in plain language.' },
  { label: 'Update my profile', prompt: 'Propose updates to my profile based on what I tell you next.' },
  { label: 'Widen the search', prompt: 'Suggest tags and opportunity types to widen what Pathfinder watches.' },
]

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

/**
 * Dust’s dedicated room — context + persistent conversation.
 * Proposes; never writes without confirm.
 */
export default function DustPage() {
  const { profile, updateProfile, refreshMatches } = useAuth()
  const { messages, setMessages, consumePendingAsk, pendingAsk } = useDust()
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef(null)
  const sendingRef = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  useEffect(() => {
    if (!pendingAsk || sendingRef.current) return
    const q = consumePendingAsk()
    if (!q) return
    sendingRef.current = true
    sendText(q).finally(() => {
      sendingRef.current = false
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAsk])

  async function sendText(text) {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    setMessages((m) => [
      ...m,
      { id: `u-${Date.now()}`, role: 'user', status: 'open', text: trimmed },
    ])
    setBusy(true)
    try {
      const data = await api('/profile/dust/', { method: 'POST', body: { message: trimmed } })
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

  async function send() {
    const text = input.trim()
    if (!text) return
    setInput('')
    await sendText(text)
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
          interest_tags: tags,
          desired_types: types,
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
        m.map((item) => (item.id === msg.id ? { ...item, status: 'confirmed' } : item)),
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

  const trailBits = [
    profile?.education_level,
    profile?.location,
    ...(profile?.interest_tags || []).slice(0, 3),
    ...(profile?.desired_types || []).slice(0, 2).map((t) => typeMeta(t).short),
  ].filter(Boolean)

  return (
    <div className="mx-auto flex h-[calc(100vh-5.5rem)] max-w-5xl flex-col px-4 py-4 md:px-8">
      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[240px_1fr]">
        {/* context */}
        <aside className="flex flex-col rounded-[12px] border border-border bg-card p-4 md:overflow-y-auto">
          <div className="mb-4 flex items-center gap-2">
            <DustAvatar size={28} />
            <div>
              <h2 className="font-display text-base text-ink">Your trail</h2>
              <p className="font-mono text-[10px] uppercase tracking-wider text-label">
                What Dust knows
              </p>
            </div>
          </div>
          {trailBits.length ? (
            <ul className="mb-6 space-y-2">
              {trailBits.map((bit) => (
                <li key={bit} className="flex gap-2 text-sm text-muted">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-trail-gold" />
                  {bit}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-6 text-sm text-muted">
              Still sparse — tell Dust who you are, or{' '}
              <Link to="/profile" className="text-teal hover:text-teal-dark">
                fill your trail
              </Link>
              .
            </p>
          )}
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-label">
            Quick actions
          </p>
          <div className="flex flex-col gap-1.5">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                type="button"
                disabled={busy}
                onClick={() => sendText(a.prompt)}
                className="rounded-[8px] px-3 py-2 text-left text-sm text-ink hover:bg-page disabled:opacity-50"
              >
                {a.label}
              </button>
            ))}
          </div>
          <Link to="/profile" className="mt-auto pt-6 text-xs text-teal hover:text-teal-dark">
            Open profile →
          </Link>
        </aside>

        {/* conversation */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[12px] border border-border bg-dust-panel text-dust-bone">
          <header className="flex items-center justify-between border-b border-dust-panel-border px-5 py-4">
            <div>
              <h1 className="font-display text-lg font-semibold text-dust-bone">Dust</h1>
              <p className="font-mono text-[10.5px] tracking-[0.03em] text-dust-moss">
                TRACES ON YOUR TRAIL
              </p>
            </div>
          </header>

          <div className="relative flex-1 overflow-y-auto px-5 py-5">
            <ul className="space-y-5">
              {messages.map((msg, i) => (
                <li
                  key={msg.id}
                  className="ease-rise flex gap-3"
                  style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
                >
                  <span
                    className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                      msg.status === 'confirmed'
                        ? 'border-dust-moss bg-dust-moss text-dust-bone'
                        : msg.role === 'user'
                          ? 'border-teal bg-teal'
                          : 'border-trail-gold/50 bg-dust-panel-elevated'
                    }`}
                  >
                    {msg.status === 'confirmed' ? (
                      <Check size={12} />
                    ) : msg.role === 'dust' ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-trail-gold" />
                    ) : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed text-[#DAD8CE]">{msg.text}</p>
                    {hasProposal(msg) && msg.status !== 'confirmed' && (
                      <div className="mt-3 space-y-2 rounded-[10px] border border-dust-panel-border bg-dust-panel-elevated p-3">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-label">
                          Propose — nothing saved until you confirm
                        </p>
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
                            Confirm
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
                            Skip
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
              placeholder="Ask Dust anything…"
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
        </section>
      </div>
    </div>
  )
}
