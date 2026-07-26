import { Link } from 'react-router-dom'
import { relativeTime, typeMeta } from '../lib/utils'
import { useAuth } from '../context/AuthContext'
import ShellPage from '../components/ShellPage'
import StatTiles from '../components/StatTiles'
import { TYPE_TO_AREA } from '../lib/sampleFeed'

function buildDigest(profile, matches, moves) {
  const items = []
  const types = profile?.desired_types || []
  const tags = profile?.interest_tags || []
  const signal =
    [profile?.email, profile?.location, profile?.education_level, tags.length, types.length].filter(
      Boolean,
    ).length

  if (types.length) {
    const labels = types
      .slice(0, 2)
      .map((t) => typeMeta(t).short)
      .join(' & ')
    items.push({
      id: 'cat',
      title: `Watching ${labels}${types.length > 2 ? ` +${types.length - 2}` : ''}`,
      body: 'Those categories stay in the scrape until you change them on your trail.',
    })
  } else {
    items.push({
      id: 'open-types',
      title: 'Opportunity types not set yet',
      body: 'Funding and advancement open wider once you pick what you want Dust to weigh.',
      link: { to: '/profile', label: 'Set types' },
    })
  }

  if (signal <= 2) {
    items.push({
      id: 'signal',
      title: 'Trail signal is still scattered',
      body: 'A clearer profile is the fastest way to turn sample listings into personal matches.',
      link: { to: '/profile', label: 'Sharpen trail' },
    })
  } else if (signal >= 4) {
    items.push({
      id: 'signal-ok',
      title: 'Trail signal is getting clear',
      body: 'Pathfinder has enough to weigh listings against you — keep refining with Dust as you go.',
    })
  }

  const saved = (matches || []).filter(
    (m) => m.match_state === 'saved' || m.match_state === 'applied',
  ).length
  if (saved) {
    items.push({
      id: 'saved',
      title: `${saved} saved listing${saved === 1 ? '' : 's'}`,
      body: 'Saved items feed Moves when research or funding can use an intro.',
      link: { to: '/matches', label: 'See matches' },
    })
  }

  if (moves?.length) {
    items.push({
      id: 'moves',
      title: `${moves.length} move${moves.length === 1 ? '' : 's'} ready`,
      body: 'Relationship-shaped next steps waiting on the Moves page.',
      link: { to: '/moves', label: 'Open moves' },
    })
  } else {
    items.push({
      id: 'week',
      title: "This week's digest",
      body: 'No personal alerts yet — when a scrape lands something for you, it shows up here first.',
    })
  }

  return items
}

/** Notifications + always-on system digest. */
export default function NotificationsPage() {
  const { profile, matches, moves, notifications, markNotificationRead } = useAuth()
  const digest = buildDigest(profile, matches, moves)
  const unread = (notifications || []).filter((n) => !n.is_read).length
  const categories = new Set(
    (profile?.desired_types || []).map((t) => TYPE_TO_AREA[t]).filter(Boolean),
  ).size

  return (
    <ShellPage>
      <StatTiles
        tiles={[
          { label: 'Alerts this week', value: notifications?.length ?? 0 },
          { label: 'Unread', value: unread },
          { label: 'Categories tracked', value: categories },
        ]}
      />

      <section className="mb-10">
        <h2 className="font-display mb-4 text-xl text-ink">Your alerts</h2>
        {notifications.length === 0 ? (
          <p className="text-sm text-muted">
            No personal notifications yet — when a match closes in or a deadline tightens, it lands
            here.
          </p>
        ) : (
          <ul className="space-y-1">
            {notifications.map((n, i) => (
              <li
                key={n.id}
                className="ease-rise"
                style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
              >
                <button
                  type="button"
                  className="flex w-full gap-3 rounded-[12px] px-4 py-3 text-left hover:bg-card"
                  onClick={() => {
                    if (!n.is_read) markNotificationRead(n.id)
                  }}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.is_read ? 'bg-border-strong opacity-70' : 'bg-teal'
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm text-ink">{formatMessage(n)}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {relativeTime(n.created_at)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl text-ink">System digest</h2>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-label">
            · always on
          </span>
        </div>
        <ul className="space-y-3">
          {digest.map((item) => (
            <li key={item.id} className="rounded-[12px] border border-border bg-card px-5 py-4">
              <p className="text-sm text-ink">{item.title}</p>
              <p className="mt-1 text-sm text-muted">{item.body}</p>
              {item.link && (
                <Link
                  to={item.link.to}
                  className="mt-2 inline-block text-sm text-teal hover:text-teal-dark"
                >
                  {item.link.label} →
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>
    </ShellPage>
  )
}

function formatMessage(n) {
  const title = n.opportunity_title
  if (title && n.message.includes(title)) {
    const parts = n.message.split(title)
    return (
      <>
        {parts[0]}
        <span className="font-medium">{title}</span>
        {parts.slice(1).join(title)}
      </>
    )
  }
  return n.message
}
