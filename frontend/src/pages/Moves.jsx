import { MessageSquare, Network, Reply, Send } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const MOVE_META = {
  intro_message: { label: 'Intro draft', icon: MessageSquare },
  follow_up: { label: 'Follow-up', icon: Reply },
  cold_outreach_draft: { label: 'Cold outreach', icon: Send },
  networking_target: { label: 'Networking target', icon: Network },
}

/** Relationship Moves feed — separate from listing Matches. */
export default function Moves() {
  const { moves } = useAuth()

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <p className="mb-6 text-sm text-muted">
        Suggested actions for the hidden market — intros, follow-ups, and people to reach. Not
        another list of postings.
      </p>

      {!moves?.length ? (
        <div className="ease-rise rounded-[12px] border border-border bg-card p-10 text-center">
          <p className="text-muted">
            No moves yet. Save or match with research and funding opportunities and we will draft
            the next step.
          </p>
        </div>
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
    </div>
  )
}
