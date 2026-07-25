import { useState } from 'react'
import {
  Bookmark,
  Briefcase,
  Building2,
  Camera,
  FlaskConical,
  GraduationCap,
  Handshake,
  Lightbulb,
  Palette,
  Rocket,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useDust } from '../context/DustContext'
import SoftAskDialog from '../components/SoftAskDialog'
import { daysUntil, typeMeta } from '../lib/utils'

const TYPE_ICONS = {
  academic: GraduationCap,
  employment: Briefcase,
  research: FlaskConical,
  professional_dev: Building2,
  experiential: Lightbulb,
  social_impact: Handshake,
  entrepreneurship: Rocket,
  cultural_exchange: Palette,
}

/** Matches feed — content only; chrome comes from AppShell. */
export default function Matches() {
  const { matches, saveOpportunity, dismissOpportunity } = useAuth()
  const { openDust } = useDust()
  const [softAsk, setSoftAsk] = useState(null)

  async function allowCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach((t) => t.stop())
      setSoftAsk(null)
    } catch {
      setSoftAsk({ permission: 'camera', blocked: true })
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Listings with why they matter —{' '}
          <Link to="/moves" className="text-teal hover:text-teal-dark">
            Moves
          </Link>{' '}
          cover the relationship side.
        </p>
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setSoftAsk({ permission: 'camera', blocked: false })}
            className="text-muted hover:text-ink"
            aria-label="Add photo"
          >
            <Camera size={18} />
          </button>
          <button type="button" onClick={openDust} className="text-teal hover:text-teal-dark">
            Ask Dust
          </button>
        </div>
      </div>

      {!matches?.length ? (
        <div className="ease-rise rounded-[12px] border border-border bg-card p-10 text-center">
          <p className="text-muted">
            No matches yet. Ask Dust to propose tags, or edit your profile along the trail.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={openDust}
              className="rounded-[12px] bg-teal px-5 py-2.5 text-white hover:bg-teal-dark"
            >
              Ask Dust
            </button>
            <Link to="/profile" className="text-sm text-muted hover:text-ink">
              Edit profile
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {matches.map((opportunity, index) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              onSave={saveOpportunity}
              onDismiss={dismissOpportunity}
              index={index}
            />
          ))}
        </div>
      )}

      {softAsk && (
        <SoftAskDialog
          permission={softAsk.permission}
          blocked={softAsk.blocked}
          icon={<Camera size={22} />}
          onAllow={allowCamera}
          onDismiss={() => setSoftAsk(null)}
        />
      )}
    </div>
  )
}

function OpportunityCard({ opportunity, onSave, onDismiss, index = 0 }) {
  const category = opportunity.category || opportunity.type
  const Icon = TYPE_ICONS[category] || Briefcase
  const days = daysUntil(opportunity.deadline_local || opportunity.deadline)
  const urgent = days !== null && days <= 5
  const saved = opportunity.match_state === 'saved' || opportunity.match_state === 'applied'
  const meta = typeMeta(category)

  return (
    <article
      className="ease-rise flex flex-col rounded-[12px] border border-border bg-card p-5"
      style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-md text-white ${meta.badgeClass}`}
        >
          <Icon size={18} />
        </span>
        {opportunity.verified ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-verified-bg px-2 py-1 text-xs text-verified">
            <ShieldCheck size={12} />
            Verified
          </span>
        ) : days !== null ? (
          <span
            className={`rounded-md px-2 py-1 text-xs ${
              urgent ? 'urgency-pulse bg-urgent text-white' : 'bg-border text-muted'
            }`}
          >
            {days < 0 ? 'Closed' : days === 0 ? 'Due today' : `${days} days left`}
          </span>
        ) : null}
      </div>

      <h2 className="mb-1 text-base text-ink">{opportunity.title}</h2>
      <p className="mb-1 text-sm text-muted">
        {opportunity.location}
        {opportunity.location ? ' · ' : ''}
        {meta.short}
      </p>

      {typeof opportunity.roi_score === 'number' && (
        <p className="mb-2 text-xs text-label">ROI {Math.round(opportunity.roi_score * 100)}</p>
      )}

      {opportunity.overlapping_tags?.length > 0 && (
        <div className="mb-3 mt-2 flex flex-wrap gap-1.5">
          {opportunity.overlapping_tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border px-2 py-0.5 text-xs text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {opportunity.why_summary && (
        <p className="mb-3 text-sm leading-relaxed text-muted">{opportunity.why_summary}</p>
      )}

      <div className="mt-auto border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted">
            <Users size={14} />
            {opportunity.interest_count || 0} others matched
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDismiss(opportunity.id)}
              className="text-muted hover:text-ink"
              aria-label="Dismiss"
            >
              <X size={18} />
            </button>
            <button
              type="button"
              onClick={() => onSave(opportunity.id)}
              className={saved ? 'text-teal' : 'text-muted hover:text-teal'}
              aria-label={saved ? 'Saved' : 'Save'}
            >
              <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
