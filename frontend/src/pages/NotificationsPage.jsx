import { relativeTime } from '../lib/utils'
import { useAuth } from '../context/AuthContext'

export default function NotificationsPage() {
  const { notifications, markNotificationRead } = useAuth()

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <ul className="space-y-1">
        {notifications.length === 0 && (
          <li className="ease-rise rounded-[12px] border border-border bg-card px-4 py-8 text-center text-sm text-muted">
            No notifications yet.
          </li>
        )}
        {notifications.map((n, i) => (
          <li key={n.id} className="ease-rise" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
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
                <span className="mt-0.5 block text-xs text-muted">{relativeTime(n.created_at)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
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
