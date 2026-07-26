import { useEffect, useRef, useState } from 'react'
import { Camera, Check, Image as ImageIcon, Loader2, Pencil, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useDust } from '../context/DustContext'
import { OPPORTUNITY_TYPES, typeMeta } from '../lib/utils'
import { formatLocation } from '../lib/location'
import ShellPage from './ShellPage'
import TrailSweepStatus from './TrailSweepStatus'
import SoftAskDialog from './SoftAskDialog'
import ProfileCameraCapture from './ProfileCameraCapture'

const GENDER_OPTIONS = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
]

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

function initialsFrom(profile) {
  const name = (profile?.name || '').trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (profile?.username || '?').charAt(0).toUpperCase()
}

/** Easter eggs only after gender is set and a photo is uploaded. */
function warmthLine({ kind, gender, hasPhoto, becameClear }) {
  const g = (gender || '').toLowerCase().trim()
  const male = g === 'male'
  const female = g === 'female'
  const eggsOn = (male || female) && hasPhoto

  if (becameClear || kind === 'clear') {
    if (eggsOn && male) return 'Trail is clear — and you look so handsome on it.'
    if (eggsOn && female) return 'Trail is clear — and you look so beautiful on it.'
    return 'Trail is clear enough to weigh listings against you.'
  }
  if (kind === 'photo') {
    if (!eggsOn) return null
    if (male) return 'You look so handsome.'
    if (female) return 'You look so beautiful.'
    return null
  }
  if (kind === 'name') {
    return 'Name locked in. Dust will weigh listings against that.'
  }
  if (kind === 'bio') {
    return 'Noted in your own words — that’s the kind of signal matching needs.'
  }
  // Gender alone never triggers the photo compliments
  if (kind === 'identity' || kind === 'gender') {
    return null
  }
  return null
}

/** Compress / square-fit an image source into a small JPEG data URL for the avatar. */
function sourceToAvatarData(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onerror = () => reject(new Error('Could not load that image.'))
    img.onload = () => {
      const side = Math.min(img.width, img.height)
      const sx = Math.max(0, Math.floor((img.width - side) / 2))
      const sy = Math.max(0, Math.floor((img.height - side) / 2))
      const out = 320
      const canvas = document.createElement('canvas')
      canvas.width = out
      canvas.height = out
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.src = src
  })
}

function fileToPhotoData(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Choose an image file.'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that image.'))
    reader.onload = () => {
      sourceToAvatarData(reader.result).then(resolve).catch(reject)
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Profile as “your trail so far” — identity first, then matching fields.
 * Onboarding wizard stays in ProfileScreen for first-time sequence.
 */
export default function ProfileTrail() {
  const { profile, matches, saveProfileAndResweep, updateProfile, trailSweep } = useAuth()
  const { messages, askDust } = useDust()
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({})
  const [saving, setSaving] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraSoftAsk, setCameraSoftAsk] = useState(null)
  const [error, setError] = useState('')
  const [signalFlash, setSignalFlash] = useState(false)
  const [toast, setToast] = useState('')
  const libraryInputRef = useRef(null)
  const toastTimer = useRef(null)

  const score = signalScore(profile)
  const signal = signalLabel(score)
  const initials = initialsFrom(profile)

  const saved = (matches || []).filter(
    (m) => m.match_state === 'saved' || m.match_state === 'applied',
  )
  const dustAsks = (messages || [])
    .filter((m) => m.role === 'user')
    .slice(-3)
    .reverse()

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    }
  }, [])

  function showToast(line) {
    if (!line) return
    setToast(line)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 3200)
  }

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

  async function saveRow(patch, { kind, resweep = true } = {}) {
    const prevScore = signalScore(profile)
    setSaving(true)
    setError('')
    try {
      const saver = resweep ? saveProfileAndResweep : updateProfile
      await saver(patch)
      setEditing(null)
      setDraft({})
      const next = signalScore({ ...profile, ...patch })
      const becameClear = prevScore < 5 && next >= 5
      if (next !== prevScore || Object.keys(patch).length) {
        setSignalFlash(true)
        window.setTimeout(() => setSignalFlash(false), 2200)
      }
      showToast(
        warmthLine({
          kind: becameClear ? 'clear' : kind,
          gender: patch.gender !== undefined ? patch.gender : profile?.gender,
          hasPhoto: Boolean(
            patch.photo_data !== undefined ? patch.photo_data : profile?.photo_data,
          ),
          becameClear,
        }),
      )
    } catch (err) {
      setError(err.message || 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  async function applyPhotoData(photo_data) {
    if (!photo_data) return
    setPhotoMenuOpen(false)
    setCameraOpen(false)
    setPhotoBusy(true)
    setError('')
    try {
      await updateProfile({ photo_data })
      showToast(
        warmthLine({
          kind: 'photo',
          gender: profile?.gender,
          hasPhoto: true,
          becameClear: false,
        }),
      )
    } catch (err) {
      setError(err.message || 'Could not update photo.')
    } finally {
      setPhotoBusy(false)
    }
  }

  async function applyPhotoFile(file) {
    if (!file) return
    setPhotoMenuOpen(false)
    setPhotoBusy(true)
    setError('')
    try {
      const photo_data = await fileToPhotoData(file)
      await updateProfile({ photo_data })
      showToast(
        warmthLine({
          kind: 'photo',
          gender: profile?.gender,
          hasPhoto: true,
          becameClear: false,
        }),
      )
    } catch (err) {
      setError(err.message || 'Could not update photo.')
    } finally {
      setPhotoBusy(false)
    }
  }

  function onPhotoPicked(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    applyPhotoFile(file)
  }

  function openCameraCapture() {
    setPhotoMenuOpen(false)
    setCameraSoftAsk({ blocked: false })
  }

  async function allowCameraAndOpen() {
    setCameraSoftAsk(null)
    setCameraOpen(true)
  }

  async function removePhoto() {
    setPhotoMenuOpen(false)
    setPhotoBusy(true)
    setError('')
    try {
      await updateProfile({ photo_data: '' })
    } catch (err) {
      setError(err.message || 'Could not remove photo.')
    } finally {
      setPhotoBusy(false)
    }
  }

  const identityRows = [
    {
      id: 'name',
      label: 'Name',
      display: profile?.name || '— not set —',
      empty: !profile?.name,
      renderEdit: () => (
        <input
          type="text"
          className="w-full rounded-[8px] border border-border bg-page px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-teal"
          value={draft.name || ''}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="How you want to be addressed"
          autoFocus
        />
      ),
      onSave: () => saveRow({ name: (draft.name || '').trim() }, { kind: 'name', resweep: false }),
      onStart: () => startEdit('name', { name: profile?.name || '' }),
    },
    {
      id: 'bio',
      label: 'Short bio',
      display: profile?.bio || '— not set —',
      empty: !profile?.bio,
      renderEdit: () => (
        <textarea
          rows={3}
          maxLength={500}
          className="w-full resize-y rounded-[8px] border border-border bg-page px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-teal"
          value={draft.bio || ''}
          onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
          placeholder="Who you are in a line or two — separate from what you’re looking for"
        />
      ),
      onSave: () => saveRow({ bio: (draft.bio || '').trim() }, { kind: 'bio', resweep: false }),
      onStart: () => startEdit('bio', { bio: profile?.bio || '' }),
    },
    {
      id: 'gender',
      label: 'Gender',
      display:
        profile?.gender === 'male'
          ? 'Male'
          : profile?.gender === 'female'
            ? 'Female'
            : '— not set —',
      empty: !profile?.gender,
      renderEdit: () => (
        <div className="flex flex-wrap gap-2">
          {GENDER_OPTIONS.map((opt) => {
            const on = draft.gender === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, gender: opt.id }))}
                className={`rounded-full border px-3 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-teal ${
                  on ? 'chip-active' : 'border-border text-muted'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      ),
      onSave: () => {
        if (!draft.gender) {
          setError('Choose Male or Female to save.')
          return
        }
        return saveRow({ gender: draft.gender }, { kind: 'gender', resweep: false })
      },
      onStart: () => startEdit('gender', { gender: profile?.gender || '' }),
    },
  ]

  const rows = [
    {
      id: 'contact',
      label: 'Contact',
      display: profile?.email || '— not set —',
      empty: !profile?.email,
      renderEdit: () => (
        <input
          type="email"
          className="w-full rounded-[8px] border border-border bg-page px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-teal"
          value={draft.email || ''}
          onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
        />
      ),
      onSave: () => saveRow({ email: draft.email || '' }, { kind: 'identity', resweep: false }),
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
            className="w-full rounded-[8px] border border-border bg-page px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-teal"
            value={draft.location || ''}
            onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
          />
          <input
            placeholder="Education / year"
            className="w-full rounded-[8px] border border-border bg-page px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-teal"
            value={draft.education_level || ''}
            onChange={(e) => setDraft((d) => ({ ...d, education_level: e.target.value }))}
          />
          <input
            placeholder="Qualifications"
            className="w-full rounded-[8px] border border-border bg-page px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-teal"
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
          className="w-full rounded-[8px] border border-border bg-page px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-teal"
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
                className={`rounded-full border px-3 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-teal ${
                  on ? 'chip-active' : 'border-border text-muted'
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

  function renderRow(row) {
    return (
      <li key={row.id} className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted">{row.label}</p>
            {editing === row.id ? (
              <div className="mt-2">{row.renderEdit()}</div>
            ) : (
              <p className={`mt-1 text-sm ${row.empty ? 'text-muted' : 'text-ink'}`}>{row.display}</p>
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
    )
  }

  return (
    <ShellPage>
      <header className="mb-8 border-b border-border pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="relative shrink-0">
              <div className="relative h-16 w-16 overflow-hidden rounded-full ring-2 ring-border">
                {profile?.photo_data ? (
                  <img
                    src={profile.photo_data}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center bg-teal text-lg font-medium text-white"
                    aria-hidden="true"
                  >
                    {initials}
                  </div>
                )}
                {photoBusy ? (
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-ink/45"
                    aria-busy="true"
                    aria-label="Updating photo"
                  >
                    <Loader2 size={20} className="animate-spin text-white" />
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                disabled={photoBusy}
                onClick={() => setPhotoMenuOpen(true)}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-ink outline-none hover:bg-page focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-50"
                aria-label={profile?.photo_data ? 'Change profile photo' : 'Add profile photo'}
                aria-haspopup="dialog"
                aria-expanded={photoMenuOpen}
                title={profile?.photo_data ? 'Change photo' : 'Add photo'}
              >
                <Camera size={14} />
              </button>
              <input
                ref={libraryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPhotoPicked}
              />
            </div>
            <div className="min-w-0 pt-1">
              <h2 className="font-display text-2xl text-ink">
                {profile?.name?.trim() || 'Your trail'}
              </h2>
              {profile?.bio ? (
                <p className="mt-1 max-w-md text-sm leading-relaxed text-muted">{profile.bio}</p>
              ) : (
                <p className="mt-1 text-sm text-muted">
                  Add a short bio so this feels like yours — not just a settings panel.
                </p>
              )}
              {profile?.gender === 'male' || profile?.gender === 'female' ? (
                <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted">
                  {profile.gender === 'male' ? 'Male' : 'Female'}
                </p>
              ) : null}
            </div>
          </div>
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

      {toast ? (
        <p
          role="status"
          className="ease-rise mb-4 rounded-[10px] border border-border bg-card px-4 py-2.5 text-sm text-ink"
        >
          {toast}
        </p>
      ) : null}

      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">Identity</p>
      <ul className="mb-8 divide-y divide-border rounded-[12px] border border-border bg-card">
        {identityRows.map(renderRow)}
      </ul>

      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
        Matching trail
      </p>
      <ul className="divide-y divide-border rounded-[12px] border border-border bg-card">
        {rows.map(renderRow)}
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
              <button
                type="button"
                onClick={() => askDust('')}
                className="text-teal outline-none hover:text-teal-dark focus-visible:underline"
              >
                ask Dust
              </button>{' '}
              or{' '}
              <Link
                to="/matches"
                className="text-teal outline-none hover:text-teal-dark focus-visible:underline"
              >
                browse matches
              </Link>
              .
            </li>
          )}
        </ul>
      </section>

      {photoMenuOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
          onClick={() => setPhotoMenuOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-[12px] border border-border bg-card p-4 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="photo-menu-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="photo-menu-title" className="font-display mb-1 text-lg text-ink">
              {profile?.photo_data ? 'Change photo' : 'Add photo'}
            </h3>
            <p className="mb-4 text-sm text-muted">
              {profile?.photo_data
                ? 'Take a new one, pick from storage, or remove the current photo.'
                : 'Take a photo or choose one from your device.'}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={photoBusy}
                onClick={openCameraCapture}
                className="flex items-center gap-3 rounded-[10px] border border-border px-4 py-3 text-left text-sm text-ink outline-none hover:bg-page focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-50"
              >
                <Camera size={16} className="shrink-0 text-trail-gold" aria-hidden="true" />
                Take a photo
              </button>
              <button
                type="button"
                disabled={photoBusy}
                onClick={() => libraryInputRef.current?.click()}
                className="flex items-center gap-3 rounded-[10px] border border-border px-4 py-3 text-left text-sm text-ink outline-none hover:bg-page focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-50"
              >
                <ImageIcon size={16} className="shrink-0 text-trail-gold" aria-hidden="true" />
                Choose from storage
              </button>
              {profile?.photo_data ? (
                <button
                  type="button"
                  disabled={photoBusy}
                  onClick={removePhoto}
                  className="flex items-center gap-3 rounded-[10px] border border-border px-4 py-3 text-left text-sm text-urgent outline-none hover:bg-page focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-50"
                >
                  <Trash2 size={16} className="shrink-0" aria-hidden="true" />
                  Remove photo
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setPhotoMenuOpen(false)}
                className="mt-1 rounded-[10px] px-4 py-2.5 text-sm text-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-teal"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {cameraSoftAsk ? (
        <SoftAskDialog
          permission="camera"
          blocked={cameraSoftAsk.blocked}
          icon={<Camera size={22} />}
          onAllow={allowCameraAndOpen}
          onDismiss={() => setCameraSoftAsk(null)}
        />
      ) : null}

      {cameraOpen ? (
        <ProfileCameraCapture
          onCapture={applyPhotoData}
          onCancel={() => setCameraOpen(false)}
          onBlocked={() => {
            setCameraOpen(false)
            setCameraSoftAsk({ blocked: true })
          }}
        />
      ) : null}
    </ShellPage>
  )
}
