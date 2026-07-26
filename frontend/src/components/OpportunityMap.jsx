import { formatLocation } from '../lib/location'

const PIN_COLORS = ['#B5624A', '#3654A6', '#D9A756', '#6E7FC7', '#6E8259', '#C48A3A']

function pinLayout(count) {
  const slots = [
    { x: 22, y: 38 },
    { x: 48, y: 28 },
    { x: 68, y: 52 },
    { x: 35, y: 62 },
    { x: 78, y: 34 },
    { x: 58, y: 68 },
  ]
  return slots.slice(0, Math.min(Math.max(count, 0), slots.length)).map((s, i) => ({
    ...s,
    color: PIN_COLORS[i % PIN_COLORS.length],
  }))
}

/**
 * Opportunity map — roads as faint lines, match pins, you-are-here.
 */
export default function OpportunityMap({ profile, matches = [], categoryCount = 0 }) {
  const place = formatLocation(profile?.location, 'Your area')
  const radius = '12km radius'
  const pinCount = matches.length
    ? Math.min(matches.length, 6)
    : Math.max(categoryCount, profile?.desired_types?.length || 0, 0)
  const pins = pinLayout(pinCount || 0)
  const mappedLabel = matches.length
    ? `${matches.length} match${matches.length === 1 ? '' : 'es'} mapped`
    : `${Math.max(categoryCount, profile?.desired_types?.length || 0)} categories mapped`

  return (
    <section className="mb-10 overflow-hidden rounded-[16px] border border-border bg-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-3.5">
        <p className="text-sm text-ink">
          <span className="font-medium">{place}</span>
          <span className="text-muted"> · {radius}</span>
        </p>
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted">{mappedLabel}</p>
      </div>

      <div
        className="relative h-56 w-full sm:h-64"
        style={{
          background:
            'radial-gradient(ellipse at 40% 45%, color-mix(in srgb, var(--pf-teal-light) 55%, transparent), transparent 55%), var(--pf-page)',
        }}
        role="img"
        aria-label={
          matches.length
            ? `Map of ${matches.length} matches near ${place}`
            : `Opportunity map around ${place}`
        }
      >
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <path
            d="M0 120 Q 180 80 360 140 T 720 110"
            fill="none"
            stroke="var(--pf-border-strong)"
            strokeWidth="1.2"
            opacity="0.45"
          />
          <path
            d="M0 180 Q 200 200 400 150 T 800 190"
            fill="none"
            stroke="var(--pf-border)"
            strokeWidth="1"
            opacity="0.55"
          />
          <path
            d="M80 0 Q 100 100 60 220 T 120 320"
            fill="none"
            stroke="var(--pf-border-strong)"
            strokeWidth="1"
            opacity="0.35"
          />
        </svg>

        {pins.map((p, i) => (
          <span
            key={i}
            className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              background: p.color,
              boxShadow: `0 0 0 3px color-mix(in srgb, ${p.color} 28%, transparent)`,
            }}
            title={matches[i]?.title || 'Opportunity'}
          />
        ))}

        <span
          className="absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2"
          title="You are here"
        >
          <span className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink/10" />
          <span className="relative block h-2.5 w-2.5 rounded-full bg-ink" />
        </span>
      </div>
    </section>
  )
}
