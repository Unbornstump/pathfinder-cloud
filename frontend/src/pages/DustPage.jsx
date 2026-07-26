import { useEffect, useRef, useState } from 'react'
import { Check, Send } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useDust } from '../context/DustContext'
import { typeMeta } from '../lib/utils'
import { formatLocation } from '../lib/location'
import DustAvatar from '../components/DustAvatar'
import TrailSweepStatus from '../components/TrailSweepStatus'

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

function messageKind(msg) {
  if (msg.role === 'user') return 'user'
  if (msg.status === 'confirmed') return 'confirmed'
  if (hasProposal(msg)) return 'proposal'
  if (msg.kind === 'error' || msg.kind === 'fallback') return 'fallback'
  if (msg.id === 'intro' || msg.id?.startsWith('intro')) return 'guidance'
  return 'guidance'
}

function proposalFields(suggestions) {
  const fields = []
  if ((suggestions?.add_tags || []).length) {
    fields.push({ label: 'Tags', value: suggestions.add_tags.join(', ') })
  }
  if ((suggestions?.enable_types || []).length) {
    fields.push({
      label: 'Types',
      value: suggestions.enable_types.map((t) => typeMeta(t).short).join(', '),
    })
  }
  if (suggestions?.profile_patch?.location) {
    fields.push({ label: 'Location', value: suggestions.profile_patch.location })
  }
  if (suggestions?.profile_patch?.education_level) {
    fields.push({ label: 'Education', value: suggestions.profile_patch.education_level })
  }
  if ((suggestions?.profile_patch?.interest_tags || []).length) {
    fields.push({
      label: 'Interest tags',
      value: suggestions.profile_patch.interest_tags.join(', '),
    })
  }
  if ((suggestions?.profile_patch?.desired_types || []).length) {
    fields.push({
      label: 'Desired types',
      value: suggestions.profile_patch.desired_types.map((t) => typeMeta(t).short).join(', '),
    })
  }
  return fields
}

/**
 * Dust’s dedicated room — context + persistent conversation.
 * Uses shared theme tokens so light/dark match the rest of the shell.
 */
export default function DustPage() {
  const { profile, saveProfileAndResweep } = useAuth()
  const { messages, setMessages, consumePendingAsk, pendingAsk } = useDust()
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [workingLabel, setWorkingLabel] = useState('Sweeping…')
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
    setWorkingLabel('Filtering intent…')
    setBusy(true)
    try {
      const data = await api('/profile/dust/', { method: 'POST', body: { message: trimmed } })
      const hasProp = hasProposal({ suggestions: data.suggestions })
      const reply = data.reply || ''
      const looksSoft =
        /couldn'?t|could not|not sure|try rephrasing|more specific/i.test(reply)
      const kind = hasProp ? 'proposal' : looksSoft ? 'fallback' : 'guidance'
      setMessages((m) => [
        ...m,
        {
          id: `d-${Date.now()}`,
          role: 'dust',
          status: 'open',
          kind,
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
          kind: 'error',
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
    setWorkingLabel('Applying to your trail…')
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

      await saveProfileAndResweep(payload)
      setMessages((m) =>
        m.map((item) => (item.id === msg.id ? { ...item, status: 'confirmed' } : item)),
      )
      setMessages((m) => [
        ...m,
        {
          id: `ok-${Date.now()}`,
          role: 'dust',
          status: 'confirmed',
          kind: 'guidance',
          text: 'Applied. Your trail is updated — sweeping for matches that fit.',
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
          kind: 'error',
          text: err.message || 'Could not apply those changes.',
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  function dismissProposal(msg) {
    setMessages((m) =>
      m.map((item) => (item.id === msg.id ? { ...item, status: 'skipped' } : item)),
    )
    setMessages((m) => [
      ...m,
      {
        id: `adj-${Date.now()}`,
        role: 'dust',
        status: 'open',
        kind: 'guidance',
        text: 'Tell me what to adjust and I’ll propose again.',
      },
    ])
  }

  const trailBits = [
    profile?.education_level,
    formatLocation(profile?.location),
    ...(profile?.interest_tags || []).slice(0, 3),
    ...(profile?.desired_types || []).slice(0, 2).map((t) => typeMeta(t).short),
  ].filter(Boolean)

  return (
    <div className="mx-auto flex h-[calc(100%-0.5rem)] min-h-[28rem] max-w-5xl flex-col px-4 py-4 sm:px-6 md:px-8">
      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[240px_1fr]">
        <aside className="flex flex-col rounded-[12px] border border-border bg-card p-4 md:overflow-y-auto">
          <div className="mb-4 flex items-center gap-2">
            <DustAvatar size={28} />
            <div>
              <h2 className="font-display text-base text-ink">Your trail</h2>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
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
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted">
            Quick actions
          </p>
          <div className="flex flex-col gap-1.5">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                type="button"
                disabled={busy}
                onClick={() => sendText(a.prompt)}
                className="rounded-[8px] px-3 py-2 text-left text-sm text-ink outline-none hover:bg-page focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-50"
              >
                {a.label}
              </button>
            ))}
          </div>
          <Link
            to="/profile"
            className="mt-auto pt-6 text-xs text-teal outline-none hover:text-teal-dark focus-visible:underline"
          >
            Open profile →
          </Link>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-[12px] border border-border bg-card">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
            <div>
              <h1 className="font-display text-lg font-semibold text-ink">Dust</h1>
              <p className="font-mono text-[10.5px] tracking-[0.03em] text-muted">
                TRACES ON YOUR TRAIL
              </p>
            </div>
            <TrailSweepStatus />
          </header>

          <div className="relative flex-1 overflow-y-auto px-5 py-5" role="log" aria-live="polite">
            <ul className="space-y-5">
              {messages.map((msg, i) => {
                const kind = messageKind(msg)
                const isUser = kind === 'user'
                const isFallback = kind === 'fallback' || kind === 'error'
                const isProposal = kind === 'proposal' && msg.status !== 'confirmed' && msg.status !== 'skipped'
                const fields = isProposal ? proposalFields(msg.suggestions) : []

                return (
                  <li
                    key={msg.id}
                    className="ease-rise flex items-start gap-3"
                    style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
                  >
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                        kind === 'confirmed'
                          ? 'border-dust-moss bg-dust-moss text-dust-bone'
                          : isUser
                            ? 'border-teal bg-teal'
                            : isFallback
                              ? 'border-border bg-page'
                              : 'border-trail-gold/50 bg-page'
                      }`}
                      aria-hidden="true"
                    >
                      {kind === 'confirmed' ? (
                        <Check size={12} />
                      ) : !isUser ? (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isFallback ? 'bg-muted' : 'bg-trail-gold'
                          }`}
                        />
                      ) : null}
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p
                        className={`text-sm leading-relaxed ${
                          isFallback ? 'text-muted' : 'text-ink'
                        }`}
                      >
                        {msg.text}
                      </p>

                      {isProposal && (
                        <div className="mt-3 space-y-3 rounded-[10px] border border-border-strong bg-page p-4">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                            Proposed change — nothing saved until you confirm
                          </p>
                          <dl className="space-y-2">
                            {fields.map((f) => (
                              <div key={f.label} className="flex flex-wrap gap-x-2 gap-y-0.5 text-sm">
                                <dt className="font-medium text-ink">{f.label}:</dt>
                                <dd className="text-muted">{f.value}</dd>
                              </div>
                            ))}
                          </dl>
                          <div className="flex flex-wrap gap-3 pt-1">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => applySuggestions(msg)}
                              className="rounded-[8px] bg-trail-gold px-3 py-1.5 text-sm font-medium text-ink outline-none hover:brightness-105 focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-60"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => dismissProposal(msg)}
                              className="rounded-[8px] border border-border px-3 py-1.5 text-sm text-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-60"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}

              {busy && (
                <li className="flex items-start gap-3" aria-busy="true">
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-trail-gold/50 bg-page"
                    aria-hidden="true"
                  >
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-trail-gold" />
                  </span>
                  <p className="pt-0.5 font-mono text-xs uppercase tracking-wider text-muted">
                    {workingLabel}
                    <span className="dust-working-dots" aria-hidden="true">
                      …
                    </span>
                  </p>
                </li>
              )}
            </ul>
            <div ref={bottomRef} />
          </div>

          <form
            className="flex gap-2.5 border-t border-border p-4"
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
          >
            <label htmlFor="dust-chat-input" className="sr-only">
              Message Dust
            </label>
            <input
              id="dust-chat-input"
              className="flex-1 rounded-[10px] border border-border bg-page px-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-muted focus:border-trail-gold focus-visible:ring-2 focus-visible:ring-teal"
              placeholder="Ask Dust anything…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-trail-gold text-ink outline-none hover:brightness-105 focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-50"
              aria-label="Send message"
            >
              <Send size={15} />
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
