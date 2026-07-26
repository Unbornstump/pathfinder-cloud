import { useAuth } from '../context/AuthContext'

/** Inline dust-themed working pill while profile rematch runs. */
export default function TrailSweepStatus({ className = '' }) {
  const { trailSweep } = useAuth()
  if (!trailSweep?.line) return null
  return (
    <p
      className={`inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-trail-gold ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-trail-gold opacity-40" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-trail-gold" />
      </span>
      {trailSweep.line}
    </p>
  )
}
