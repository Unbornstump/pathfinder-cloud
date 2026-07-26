import { useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useDust } from '../context/DustContext'
import { OPPORTUNITY_TYPES, typeMeta } from '../lib/utils'
import { formatLocation } from '../lib/location'
import ShellPage from './ShellPage'
import TrailSweepStatus from './TrailSweepStatus'

function signalScore(profile) {
  let n = 0
  if (profile?.email) n += 1
  if (profile?.location) n += 1
  if (profile?.education_level) n += 1
  if (profile?.interest_tags?.length) n += 1
  if (profile?.desired_types?.length) n += 1
  return n
}

function signalLabel(score) {
  if (score <= 1) return { word: 'scattered', hint: 'Add location and types so matches can find you.' }
  if (score <= 3) return { word: 'forming', hint: 'A few more details will bring this from forming to clear.' }
  return { word: 'clear', hint: 'Trail is clear enough to weigh listings against you.' }
}

function SignalDots({ score }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Signal ${score} of 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full ${
            i < score ? 'bg-trail-gold' : 'bg-border-strong'
          }`}
        />
      ))}
    </span>
  )
}

/**
 * Profile as “your trail so far” — summary-first, inline edit per row.
 * Onboarding wizard stays in ProfileScreen for first-time sequence.
 */
export default function ProfileTrail() {
  const { profile, matches, saveProfileAndResweep, trailSweep } = useAuth()
  const { messages, askDust } = useDust()
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [signalFlash, setSignalFlash] = useState(false)

  const score = signalScore(profile)
  const signal = signalLabel(score)

  const saved = (matches || []).filter(
    (m) => m.match_state === 'saved' || m.match_state === 'applied',
  )
  const dustAsks = (messages || [])
    .filter((m) => m.role === 'user')
    .slice(-3)
    .reverse()

  function startEdit(row, values) {
    setEditing(row)
    setDraft(values)
    setError('')
  }

  function cancelEdit() {
    setEditing(null)
    setDraft({})
    setError('')
  }

  async function saveRow(patch) {
    const prevScore = signalScore(profile)
    setSaving(true)
    setError('')
    try {
      await saveProfileAndResweep(patch)
      setEditing(null)
      setDraft({})
      const next = signalScore({ ...profile, ...patch })
      // recompute from merged view; profile state updates async — flash if we expect change
      if (next !== prevScore || Object.keys(patch).length) {
        setSignalFlash(true)
        window.setTimeout(() => setSignalFlash(false), 2200)
      }
    } catch (err) {
      setError(err.message || 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  const rows = [
    {
      id: 'contact',
      label: 'Contact',
      display: profile?.email || '— not set —',
      empty: !profile?.email,
      renderEdit: () => (
        <input
          type="email"
          className="w-full rounded-[8px] border border-border px-3 py-2 text-sm"
          value={draft.email || ''}
          onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
        />
      ),
      onSave: () => saveRow({ email: draft.email || '' }),
      onStart: () => startEdit('contact', { email: profile?.email || '' }),
    },
    {
      id: 'background',
      label: 'Location & background',
      display: [formatLocation(profile?.location), profile?.education_level, profile?.qualifications]
        .filter(Boolean)
        .join(' · ') || '— not set —',
      empty: !profile?.location && !profile?.education_level,
      renderEdit: () => (
        <div className="space-y-2">
          <input
            placeholder="Location"
            className="w-full rounded-[8px] border border-border px-3 py-2 text-sm"
            value={draft.location || ''}
            onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
          />
          <input
            placeholder="Education / year"
            className="w-full rounded-[8px] border border-border px-3 py-2 text-sm"
            value={draft.education_level || ''}
            onChange={(e) => setDraft((d) => ({ ...d, education_level: e.target.value }))}
          />
          <input
            placeholder="Qualifications"
            className="w-full rounded-[8px] border border-border px-3 py-2 text-sm"
            value={draft.qualifications || ''}
            onChange={(e) => setDraft((d) => ({ ...d, qualifications: e.target.value }))}
          />
        </div>
      ),
      onSave: () =>
        saveRow({
          location: draft.location || '',
          education_level: draft.education_level || '',
          qualifications: draft.qualifications || '',
        }),
      onStart: () =>
        startEdit('background', {
          location: profile?.location || '',
          education_level: profile?.education_level || '',
          qualifications: profile?.qualifications || '',
        }),
    },
    {
      id: 'interests',
      label: 'Interests',
      display: profile?.interest_tags?.length
        ? profile.interest_tags.join(', ')
        : '— not set —',
      empty: !profile?.interest_tags?.length,
      renderEdit: () => (
        <input
          placeholder="Comma-separated tags"
          className="w-full rounded-[8px] border border-border px-3 py-2 text-sm"
          value={draft.tagsText || ''}
          onChange={(e) => setDraft((d) => ({ ...d, tagsText: e.target.value }))}
        />
      ),
      onSave: () =>
        saveRow({
          interest_tags: (draft.tagsText || '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      onStart: () =>
        startEdit('interests', { tagsText: (profile?.interest_tags || []).join(', ') }),
    },
    {
      id: 'types',
      label: 'Desired opportunity types',
      display: profile?.desired_types?.length
        ? profile.desired_types.map((t) => typeMeta(t).short).join(', ')
        : '— not set —',
      empty: !profile?.desired_types?.length,
      renderEdit: () => (
        <div className="flex flex-wrap gap-2">
          {OPPORTUNITY_TYPES.map((t) => {
            const on = (draft.desired_types || []).includes(t.id)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  setDraft((d) => {
                    const cur = d.desired_types || []
                    return {
                      ...d,
                      desired_types: on ? cur.filter((x) => x !== t.id) : [...cur, t.id],
                    }
                  })
                }
                className={`rounded-full border px-3 py-1 text-xs ${
                  on ? 'border-teal bg-teal text-white' : 'border-border text-muted'
                }`}
              >
                {t.short}
              </button>
            )
          })}
        </div>
      ),
      onSave: () => saveRow({ desired_types: draft.desired_types || [] }),
      onStart: () => startEdit('types', { desired_types: [...(profile?.desired_types || [])] }),
    },
  ]

  return (
    <ShellPage>
      <header className="mb-8 border-b border-border pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-ink">Your trail</h2>
          <div
            className={`flex shrink-0 items-center gap-2 text-sm text-muted transition ${
              signalFlash ? 'scale-105 text-trail-gold' : ''
            }`}
          >
            <span className="font-mono text-[11px] uppercase tracking-wider">Signal</span>
            <SignalDots score={score} />
            <span className="text-trail-gold">{signal.word}</span>
          </div>
        </div>
        {trailSweep ? (
          <TrailSweepStatus className="mt-3" />
        ) : (
          <p className="mt-3 text-sm text-muted">
            {score < 5
              ? `Add your ${
                  !profile?.desired_types?.length
                    ? 'desired opportunity types'
                    : !profile?.interest_tags?.length
                      ? 'interests'
                      : 'missing details'
                } to bring this from ${signal.word} to clear.`
              : signal.hint}
          </p>
        )}
      </header>

      {error && <p className="mb-4 text-sm text-urgent">{error}</p>}

      <ul className="divide-y divide-border rounded-[12px] border border-border bg-card">
        {rows.map((row) => (
          <li key={row.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[11px] uppercase tracking-wider text-label">
                  {row.label}
                </p>
                {editing === row.id ? (
                  <div className="mt-2">{row.renderEdit()}</div>
                ) : (
                  <p className={`mt-1 text-sm ${row.empty ? 'text-label' : 'text-ink'}`}>
                    {row.display}
                  </p>
                )}
              </div>
              {editing === row.id ? (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={saving || Boolean(trailSweep)}
                    onClick={row.onSave}
                    className="rounded-full bg-teal p-2 text-white outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-50"
                    aria-label="Save"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-full border border-border p-2 text-muted outline-none focus-visible:ring-2 focus-visible:ring-teal"
                    aria-label="Cancel"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={row.onStart}
                  className="shrink-0 rounded-full border border-border p-2 text-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-teal"
                  aria-label={`Edit ${row.label}`}
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <section className="mt-10">
        <h3 className="font-display mb-4 text-xl text-ink">Your history</h3>
        <ul className="space-y-3">
          {saved.slice(0, 5).map((m) => (
            <li key={m.id} className="text-sm text-muted">
              <span className="text-ink">Saved:</span> {m.title}
            </li>
          ))}
          {dustAsks.map((m) => (
            <li key={m.id} className="text-sm text-muted">
              <span className="text-ink">Asked Dust:</span> “{m.text.slice(0, 80)}
              {m.text.length > 80 ? '…' : ''}”
            </li>
          ))}
          {(profile?.desired_types || []).length > 0 && (
            <li className="text-sm text-muted">
              <span className="text-ink">Explored:</span>{' '}
              {profile.desired_types.map((t) => typeMeta(t).short).join(', ')}
            </li>
          )}
          {!saved.length && !dustAsks.length && !(profile?.desired_types || []).length && (
            <li className="text-sm text-muted">
              Nothing on the trail yet —{' '}
              <button type="button" onClick={() => askDust('')} className="text-teal hover:text-teal-dark">
                ask Dust
              </button>{' '}
              or{' '}
              <Link to="/matches" className="text-teal hover:text-teal-dark">
                browse matches
              </Link>
              .
            </li>
          )}
        </ul>
      </section>
    </ShellPage>
  )
}
