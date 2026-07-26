import { MessageSquare, Network, Reply, Send } from 'lucide-react'
import { EXAMPLE_MOVES } from '../lib/sampleFeed'

const ICONS = {
  'Intro draft': MessageSquare,
  'Cold outreach': Send,
  'Follow-up': Reply,
  default: Network,
}

/** Middle-column timeline of drafted intros / outreach shapes. */
export default function MovesTimeline({ moves = [], examples = EXAMPLE_MOVES }) {
  const personal = (moves || []).map((m) => ({
    id: m.id,
    label: m.move_type?.replace(/_/g, ' ') || 'Move',
    target: m.target_person_or_org,
    text: m.suggested_action_text,
    personal: true,
  }))

  const items = personal.length
    ? personal
    : examples.map((ex) => ({ ...ex, personal: false }))

  return (
    <section className="mb-10 overflow-hidden rounded-[16px] border border-border bg-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-3.5">
        <p className="font-display text-base text-ink">
          {personal.length ? 'Drafted outreach' : 'How moves look'}
        </p>
        <p className="font-mono text-[11px] uppercase tracking-wider text-label">
          {personal.length ? `${personal.length} on your trail` : '· Example'}
        </p>
      </div>
      <ol className="relative space-y-0 px-5 py-2">
        {items.map((item, i) => {
          const Icon = ICONS[item.label] || ICONS.default
          return (
            <li key={item.id} className="relative flex gap-4 py-4">
              {i < items.length - 1 && (
                <span
                  className="absolute bottom-0 left-[15px] top-10 w-px bg-border"
                  aria-hidden
                />
              )}
              <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-light text-teal">
                <Icon size={14} />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="font-mono text-[11px] uppercase tracking-wider text-trail-gold">
                  {item.label}
                </p>
                <p className="mt-0.5 text-sm text-ink">{item.target}</p>
                <p className="mt-1 text-sm text-muted">{item.text}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
