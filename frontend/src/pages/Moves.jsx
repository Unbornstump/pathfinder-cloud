import { MessageSquare, Network, Reply, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import StatusStrip from '../components/StatusStrip'
import QuickAskBar from '../components/QuickAskBar'
import ShellPage from '../components/ShellPage'
import StatTiles from '../components/StatTiles'
import MovesTimeline from '../components/MovesTimeline'

const MOVE_META = {
  intro_message: { label: 'Intro draft', icon: MessageSquare },
  follow_up: { label: 'Follow-up', icon: Reply },
  cold_outreach_draft: { label: 'Cold outreach', icon: Send },
  networking_target: { label: 'Networking target', icon: Network },
}

/** Living Moves page — stats + timeline middle column. */
export default function Moves() {
  const { profile, moves } = useAuth()
  const hasMoves = Boolean(moves?.length)
  const followUps = (moves || []).filter((m) => m.move_type === 'follow_up').length
  const drafted = moves?.length ?? 0

  return (
    <ShellPage>
      <StatusStrip profile={profile} scrapedLabel="relationship side · live" />

      <StatTiles
        tiles={[
          { label: 'Moves drafted', value: drafted },
          { label: 'Follow-ups pending', value: followUps },
          { label: 'On your trail', value: hasMoves ? 'Active' : 'Quiet' },
        ]}
      />

      <MovesTimeline moves={moves} />

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
        {hasMoves && (
          <p className="mt-3 text-xs text-label">
            <Link to="/matches" className="text-teal hover:text-teal-dark">
              Browse matches
            </Link>{' '}
            to feed more moves.
          </p>
        )}
      </section>

      <QuickAskBar placeholder='Ask Dust "who should I reach about fellowships?"…' />
    </ShellPage>
  )
}
