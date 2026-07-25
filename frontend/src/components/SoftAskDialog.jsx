import { X } from 'lucide-react'

const COPY = {
  camera: {
    title: 'Camera access',
    allow: 'Pathfinder uses your camera so you can add a profile photo or scan your CV.',
    blocked:
      'Camera access is blocked for this site. Open your browser site settings and allow camera, then try again.',
  },
  microphone: {
    title: 'Microphone access',
    allow: 'Pathfinder uses your microphone so you can fill in profile fields by speaking instead of typing.',
    blocked:
      'Microphone access is blocked for this site. Open your browser site settings and allow microphone, then try again.',
  },
  location: {
    title: 'Location access',
    allow: 'Pathfinder uses your location to show opportunities near you.',
    blocked:
      'Location access is blocked for this site. Open your browser site settings and allow location, then try again.',
  },
  notifications: {
    title: 'Notification access',
    allow: 'Pathfinder can alert you about new matches or closing deadlines.',
    blocked:
      'Notifications are blocked for this site. Open your browser site settings and allow notifications, then try again.',
  },
}

export default function SoftAskDialog({ permission, blocked = false, icon, onAllow, onDismiss }) {
  const copy = COPY[permission]
  if (!copy) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4" onClick={onDismiss}>
      <div
        className="relative w-full max-w-sm rounded-[12px] border border-border bg-card p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="soft-ask-title"
      >
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-3 top-3 text-muted hover:text-ink"
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal/15 text-teal">
          {icon}
        </div>
        <h2 id="soft-ask-title" className="mb-2 text-lg text-ink">
          {copy.title}
        </h2>
        <p className="mb-6 text-sm text-muted">{blocked ? copy.blocked : copy.allow}</p>
        {!blocked && (
          <button
            type="button"
            onClick={onAllow}
            className="mb-3 w-full rounded-[12px] bg-teal px-4 py-2.5 text-white hover:bg-teal-dark"
          >
            Allow access
          </button>
        )}
        <button type="button" onClick={onDismiss} className="w-full text-sm text-muted hover:text-ink">
          {blocked ? 'Close' : 'Not now'}
        </button>
      </div>
    </div>
  )
}
