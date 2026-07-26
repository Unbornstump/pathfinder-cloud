import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { typeMeta, OPPORTUNITY_TYPES, relativeTime } from '../lib/utils'
import { TYPE_TO_AREA } from '../lib/sampleFeed'
import { formatLocation } from '../lib/location'

function scrapedPhrase(lastScrapedAt, fallback = 'awaiting first scrape') {
  if (!lastScrapedAt) return fallback
  const rel = relativeTime(lastScrapedAt)
  if (rel === 'just now') return 'last scraped just now'
  return `last scraped ${rel}`
}

/** Always-on status for Matches / Moves — what Pathfinder is watching. */
export default function StatusStrip({
  profile,
  scrapedLabel,
  lastScrapedAt = null,
}) {
  const summary = useMemo(() => {
    const types = profile?.desired_types || []
    const loc = formatLocation(profile?.location)
    const typeLabels = types
      .slice(0, 3)
      .map((t) => typeMeta(t).short)
      .join(', ')

    if (types.length && loc) {
      return `Watching ${types.length} ${types.length === 1 ? 'type' : 'types'} in ${loc}`
    }
    if (types.length) {
      return `Watching ${typeLabels || `${types.length} types`}`
    }
    if (loc) {
      return `Watching from ${loc} · no types set yet`
    }
    return 'Watching — set location and types to sharpen the scrape'
  }, [profile])

  const areaHint = useMemo(() => {
    const types = profile?.desired_types || []
    const areas = [...new Set(types.map((t) => TYPE_TO_AREA[t]).filter(Boolean))]
    if (!areas.length) {
      return `${OPPORTUNITY_TYPES.length} categories available`
    }
    return areas.join(' · ')
  }, [profile])

  const scrapeBit =
    scrapedLabel != null ? scrapedLabel : scrapedPhrase(lastScrapedAt)

  return (
    <div className="mb-8 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-border pb-4">
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg text-ink">{summary}</p>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted">
          {areaHint} · {scrapeBit}
        </p>
      </div>
      <Link
        to="/profile"
        className="shrink-0 whitespace-nowrap text-sm text-teal outline-none hover:text-teal-dark focus-visible:underline"
      >
        Sharpen profile
      </Link>
    </div>
  )
}
