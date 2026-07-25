import { useCallback, useEffect, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router-dom'
import {
  Briefcase,
  Building2,
  Check,
  FileText,
  Flag,
  FlaskConical,
  GraduationCap,
  Handshake,
  Lightbulb,
  Mail,
  MapPin,
  Mic,
  Palette,
  Plus,
  Rocket,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import SoftAskDialog from '../components/SoftAskDialog'
import DiscardDialog from '../components/DiscardDialog'
import { OPPORTUNITY_TYPES, WEDGE_TAG_HINTS } from '../lib/utils'

const SECTIONS = [
  { id: 'contact', label: 'Contact' },
  { id: 'background', label: 'Location and background' },
  { id: 'interests', label: 'Interests' },
  { id: 'types', label: 'Desired opportunity types' },
]

export default function ProfileScreen({ mode = 'onboarding' }) {
  const { profile, updateProfile, refreshMatches } = useAuth()
  const navigate = useNavigate()
  const isEdit = mode === 'edit' || Boolean(profile?.onboarding_complete)
  const [step, setStep] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [softAsk, setSoftAsk] = useState(null)
  const [locationAsked, setLocationAsked] = useState(false)
  const [form, setForm] = useState({
    email: profile?.email || '',
    location: profile?.location || '',
    education_level: profile?.education_level || '',
    qualifications: profile?.qualifications || '',
    interest_tags: profile?.interest_tags || [],
    desired_types: profile?.desired_types || [],
  })

  useEffect(() => {
    if (!profile || dirty) return
    setForm({
      email: profile.email || '',
      location: profile.location || '',
      education_level: profile.education_level || '',
      qualifications: profile.qualifications || '',
      interest_tags: profile.interest_tags || [],
      desired_types: profile.desired_types || [],
    })
  }, [profile, dirty])

  const markDirty = useCallback((updater) => {
    setDirty(true)
    setForm(updater)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (!dirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const blocker = useBlocker(dirty)

  useEffect(() => {
    if (step === 1 && !locationAsked) {
      setLocationAsked(true)
      setSoftAsk({ permission: 'location', blocked: false })
    }
  }, [step, locationAsked])

  async function checkPermissionDenied(name) {
    if (!navigator.permissions?.query) return false
    try {
      const status = await navigator.permissions.query({ name })
      return status.state === 'denied'
    } catch {
      return false
    }
  }

  async function allowLocation() {
    setSoftAsk(null)
    if (!navigator.geolocation) return
    if (await checkPermissionDenied('geolocation')) {
      setSoftAsk({ permission: 'location', blocked: true })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        markDirty((f) => ({
          ...f,
          location: f.location || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
        }))
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setSoftAsk({ permission: 'location', blocked: true })
        }
      },
    )
  }

  function requestMic() {
    setSoftAsk({ permission: 'microphone', blocked: false })
  }

  async function allowMic() {
    setSoftAsk(null)
    if (await checkPermissionDenied('microphone')) {
      setSoftAsk({ permission: 'microphone', blocked: true })
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
    } catch {
      setSoftAsk({ permission: 'microphone', blocked: true })
    }
  }

  function addTag() {
    const tag = tagInput.trim()
    if (!tag) return
    if (form.interest_tags.map((t) => t.toLowerCase()).includes(tag.toLowerCase())) {
      setTagInput('')
      return
    }
    markDirty((f) => ({ ...f, interest_tags: [...f.interest_tags, tag] }))
    setTagInput('')
  }

  function toggleType(id) {
    markDirty((f) => {
      const has = f.desired_types.includes(id)
      return {
        ...f,
        desired_types: has ? f.desired_types.filter((t) => t !== id) : [...f.desired_types, id],
      }
    })
  }

  function formatErr(err) {
    if (!err) return 'Could not save'
    if (typeof err.data === 'object' && err.data) {
      const parts = Object.entries(err.data).flatMap(([key, val]) => {
        if (key === 'detail') return [typeof val === 'string' ? val : JSON.stringify(val)]
        const msgs = Array.isArray(val) ? val : [val]
        return msgs.map((m) => `${key}: ${m}`)
      })
      if (parts.length) return parts.join(' ')
    }
    return typeof err.message === 'string' ? err.message : 'Could not save'
  }

  async function saveAndContinue() {
    setError('')
    setSaving(true)
    const payload = {
      email: form.email,
      location: form.location,
      education_level: form.education_level,
      qualifications: form.qualifications,
      interest_tags: form.interest_tags,
      desired_types: form.desired_types,
    }
    try {
      if (step < SECTIONS.length - 1) {
        try {
          await updateProfile(payload)
          setDirty(false)
        } catch (err) {
          setError(formatErr(err))
        }
        setStep((s) => s + 1)
      } else {
        await updateProfile({
          ...payload,
          onboarding_complete: true,
        })
        setDirty(false)
        try {
          await refreshMatches()
        } catch {
          /* matches can load on the feed */
        }
        if (isEdit) {
          navigate('/matches', { replace: true })
          return
        }
        setSoftAsk({ permission: 'notifications', blocked: false })
      }
    } catch (err) {
      setError(formatErr(err))
    } finally {
      setSaving(false)
    }
  }

  async function allowNotifications() {
    setSoftAsk(null)
    if ('Notification' in window && Notification.permission !== 'denied') {
      try {
        await Notification.requestPermission()
      } catch {
        /* ignore */
      }
    } else if ('Notification' in window && Notification.permission === 'denied') {
      setSoftAsk({ permission: 'notifications', blocked: true })
      return
    }
    navigate('/matches', { replace: true })
  }

  const typeIcons = {
    academic: GraduationCap,
    employment: Briefcase,
    research: FlaskConical,
    professional_dev: Building2,
    experiential: Lightbulb,
    social_impact: Handshake,
    entrepreneurship: Rocket,
    cultural_exchange: Palette,
  }

  return (
    <div className="min-h-screen bg-page px-4 py-8 md:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            {!isEdit && <h1 className="text-xl text-ink md:text-2xl">Your profile</h1>}
            {isEdit && (
              <p className="text-sm text-muted">
                Same trail as onboarding — change anything and save.
              </p>
            )}
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`h-1 w-8 rounded-full ${i <= step + 1 ? 'bg-teal' : 'bg-border'}`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-8 md:flex-row md:gap-12">
          {/* Trail rail */}
          <aside className="relative md:w-56 md:shrink-0">
            <div className="trail-line absolute bottom-3 left-[15px] top-3 md:bottom-4 md:top-4" />
            <ul className="space-y-6">
              {SECTIONS.map((section, index) => {
                const completed = index < step
                const current = index === step
                return (
                  <li key={section.id} className="relative flex items-start gap-3 pl-1">
                    <span
                      className={`waypoint-marker relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                        completed
                          ? 'border-experiential bg-experiential text-white'
                          : current
                            ? 'border-teal bg-teal text-white'
                            : 'border-trail bg-page text-trail'
                      }`}
                    >
                      <span
                        key={`${section.id}-${completed ? 'done' : current ? 'active' : 'up'}`}
                        className="waypoint-icon flex items-center justify-center"
                      >
                        {completed ? (
                          <Check size={14} className="ease-rise" />
                        ) : current ? (
                          <MapPin size={14} className="ease-rise" />
                        ) : (
                          <Flag size={12} />
                        )}
                      </span>
                    </span>
                    <div className="pt-1">
                      <p className={`text-sm ${current ? 'text-ink' : 'text-muted'}`}>{section.label}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </aside>

          {/* Active section */}
          <div className="min-w-0 flex-1 rounded-[12px] border border-border bg-card p-6 md:p-8">
            <h1 className="mb-6 text-xl text-ink">{SECTIONS[step].label}</h1>

            {step === 0 && (
              <label className="block">
                <span className="mb-1.5 block text-sm text-muted">Email</span>
                <div className="flex items-center gap-2 rounded-[12px] border border-border px-3 py-2.5 focus-within:border-teal">
                  <Mail size={18} className="text-muted" />
                  <input
                    type="email"
                    className="w-full bg-transparent outline-none"
                    value={form.email}
                    onChange={(e) => markDirty((f) => ({ ...f, email: e.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    onClick={requestMic}
                    className="text-muted hover:text-teal"
                    aria-label="Speak instead"
                  >
                    <Mic size={18} />
                  </button>
                </div>
              </label>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm text-muted">Location</span>
                  <div className="flex items-center gap-2 rounded-[12px] border border-border px-3 py-2.5 focus-within:border-teal">
                    <MapPin size={18} className="text-muted" />
                    <input
                      className="w-full bg-transparent outline-none"
                      value={form.location}
                      onChange={(e) => markDirty((f) => ({ ...f, location: e.target.value }))}
                      placeholder="City or region"
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm text-muted">Education level</span>
                  <div className="flex items-center gap-2 rounded-[12px] border border-border px-3 py-2.5 focus-within:border-teal">
                    <GraduationCap size={18} className="text-muted" />
                    <input
                      className="w-full bg-transparent outline-none"
                      value={form.education_level}
                      onChange={(e) => markDirty((f) => ({ ...f, education_level: e.target.value }))}
                      placeholder="e.g. bachelor's degree"
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm text-muted">Qualifications</span>
                  <div className="flex items-start gap-2 rounded-[12px] border border-border px-3 py-2.5 focus-within:border-teal">
                    <FileText size={18} className="mt-0.5 text-muted" />
                    <textarea
                      className="min-h-24 w-full resize-y bg-transparent outline-none"
                      value={form.qualifications}
                      onChange={(e) => markDirty((f) => ({ ...f, qualifications: e.target.value }))}
                      placeholder="Degrees, certificates, skills"
                    />
                  </div>
                </label>
              </div>
            )}

            {step === 2 && (
              <div>
                <p className="mb-3 text-sm text-muted">
                  Start with funding and fellowships tags — you can always add more later.
                </p>
                <div className="mb-3 flex flex-wrap gap-2">
                  {WEDGE_TAG_HINTS.map((hint) => {
                    const active = form.interest_tags
                      .map((t) => t.toLowerCase())
                      .includes(hint.toLowerCase())
                    return (
                      <button
                        key={hint}
                        type="button"
                        disabled={active}
                        onClick={() =>
                          markDirty((f) => ({
                            ...f,
                            interest_tags: [...f.interest_tags, hint],
                          }))
                        }
                        className={`rounded-full border px-3 py-1 text-sm ${
                          active
                            ? 'border-research/30 bg-research/10 text-research'
                            : 'border-border text-muted hover:border-research hover:text-research'
                        }`}
                      >
                        {hint}
                      </button>
                    )
                  })}
                </div>
                <div className="mb-4 flex flex-wrap gap-2">
                  {form.interest_tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-page px-3 py-1 text-sm text-ink"
                    >
                      {tag}
                      <button
                        type="button"
                        aria-label={`Remove ${tag}`}
                        onClick={() =>
                          markDirty((f) => ({
                            ...f,
                            interest_tags: f.interest_tags.filter((t) => t !== tag),
                          }))
                        }
                        className="text-muted hover:text-ink"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-[12px] border border-border px-3 py-2.5 outline-none focus:border-teal"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag()
                      }
                    }}
                    placeholder="e.g. fellowship"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="inline-flex items-center gap-1 rounded-[12px] border border-teal px-4 py-2.5 text-teal hover:bg-teal/5"
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <p className="mb-3 text-sm text-muted">
                  All eight categories are available. Research & innovation is our current focus —
                  pick that plus any others you want watched.
                </p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {OPPORTUNITY_TYPES.map((t) => {
                    const Icon = typeIcons[t.id]
                    const selected = form.desired_types.includes(t.id)
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleType(t.id)}
                        className={`relative flex flex-col items-center gap-2 rounded-[12px] border-2 px-2 py-4 text-center text-xs transition-colors sm:text-sm ${
                          selected
                            ? t.colorClass
                            : 'border-border bg-card text-muted hover:border-muted'
                        }`}
                      >
                        {t.wedge && (
                          <span
                            className={`absolute right-1.5 top-1.5 rounded px-1 text-[9px] uppercase tracking-wide ${
                              selected ? 'bg-white/20 text-white' : 'bg-research/10 text-research'
                            }`}
                          >
                            focus
                          </span>
                        )}
                        <Icon size={20} />
                        {t.short}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {error && <p className="mt-4 text-sm text-urgent">{error}</p>}

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="text-sm text-muted hover:text-ink disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveAndContinue}
                className="rounded-[12px] bg-teal px-5 py-2.5 text-white hover:bg-teal-dark disabled:opacity-60"
              >
                {saving ? 'Saving…' : step === SECTIONS.length - 1 ? 'Save profile' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {softAsk?.permission === 'location' && (
        <SoftAskDialog
          permission="location"
          blocked={softAsk.blocked}
          icon={<MapPin size={22} />}
          onAllow={allowLocation}
          onDismiss={() => setSoftAsk(null)}
        />
      )}
      {softAsk?.permission === 'microphone' && (
        <SoftAskDialog
          permission="microphone"
          blocked={softAsk.blocked}
          icon={<Mic size={22} />}
          onAllow={allowMic}
          onDismiss={() => setSoftAsk(null)}
        />
      )}
      {softAsk?.permission === 'notifications' && (
        <SoftAskDialog
          permission="notifications"
          blocked={softAsk.blocked}
          icon={<Mail size={22} />}
          onAllow={allowNotifications}
          onDismiss={() => {
            setSoftAsk(null)
            navigate('/matches', { replace: true })
          }}
        />
      )}

      {blocker.state === 'blocked' && (
        <DiscardDialog
          onStay={() => blocker.reset?.()}
          onDiscard={() => {
            setDirty(false)
            blocker.proceed?.()
          }}
        />
      )}
    </div>
  )
}
