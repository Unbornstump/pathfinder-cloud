import { MessageSquare, Network, Reply, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import StatusStrip from '../components/StatusStrip'
import QuickAskBar from '../components/QuickAskBar'
import { EXAMPLE_MOVES } from '../lib/sampleFeed'

const MOVE_META = {
  intro_message: { label: 'Intro draft', icon: MessageSquare },
  follow_up: { label: 'Follow-up', icon: Reply },
  cold_outreach_draft: { label: 'Cold outreach', icon: Send },
  networking_target: { label: 'Networking target', icon: Network },
}

/** Living Moves page — personal slot + illustrative relationship feed. */
export default function Moves() {
  const { profile, moves } = useAuth()
  const hasMoves = Boolean(moves?.length)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <StatusStrip profile={profile} scrapedLabel="relationship side · live" />

      <section>
        <h2 className="font-display mb-4 text-xl text-ink">Your moves</h2>
        {!hasMoves ? (
          <p className="ease-rise text-sm leading-relaxed text-muted">
            No personal moves yet. Save research or funding matches and Dust will draft intros and
            follow-ups — the hidden market, not another posting list.
          </p>
        ) : (
          <ul className="space-y-4">
            {moves.map((move, index) => {
              const meta = MOVE_META[move.move_type] || MOVE_META.intro_message
              const Icon = meta.icon
              return (
                <li
                  key={move.id}
                  className="ease-rise rounded-[12px] border border-border bg-card p-5"
                  style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-teal text-white">
                      <Icon size={16} />
                    </span>
                    <div>
                      <p className="text-sm text-ink">{meta.label}</p>
                      <p className="text-xs text-muted">{move.target_person_or_org}</p>
                    </div>
                  </div>
                  {move.trigger_opportunity_title && (
                    <p className="mb-2 text-xs text-label">
                      Linked to: {move.trigger_opportunity_title}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed text-muted">{move.suggested_action_text}</p>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl text-ink">How moves look</h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-label">
            · illustrative
          </span>
        </div>
        <ul className="space-y-3">
          {EXAMPLE_MOVES.map((ex) => (
            <li
              key={ex.id}
              className="rounded-[12px] border border-dashed border-border-strong bg-card/60 px-5 py-4"
            >
              <p className="font-mono text-[11px] uppercase tracking-wider text-trail-gold">
                {ex.label}
              </p>
              <p className="mt-1 text-sm text-ink">{ex.target}</p>
              <p className="mt-1 text-sm text-muted">{ex.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-label">
          Examples of the shape — yours appear here once matches trigger them.{' '}
          <Link to="/matches" className="text-teal hover:text-teal-dark">
            Browse matches
          </Link>
        </p>
      </section>

      <QuickAskBar placeholder='Ask Dust "who should I reach about fellowships?"…' />
    </div>
  )
}
