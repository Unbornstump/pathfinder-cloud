import { relativeTime } from '../lib/utils'

export default function NotificationPanel({ notifications, onRead, onClose }) {
  return (
    <div className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-[12px] border border-border bg-card">
      <div className="border-b border-border px-4 py-3 text-sm font-medium text-ink">Notifications</div>
      <ul className="max-h-80 overflow-y-auto">
        {notifications.length === 0 && (
          <li className="px-4 py-6 text-sm text-muted">No notifications yet.</li>
        )}
        {notifications.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              className="flex w-full gap-3 px-4 py-3 text-left hover:bg-page/80"
              onClick={() => {
                if (!n.is_read) onRead(n.id)
              }}
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  n.is_read ? 'bg-border opacity-70' : 'bg-teal'
                }`}
              />
              <span className="min-w-0">
                <span className="block text-sm text-ink">
                  {formatMessage(n)}
                </span>
                <span className="mt-0.5 block text-xs text-muted">{relativeTime(n.created_at)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClose}
        className="w-full border-t border-border px-4 py-2 text-center text-xs text-muted hover:text-ink"
      >
        Close
      </button>
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
