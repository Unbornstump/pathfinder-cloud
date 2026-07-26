import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { typeMeta, OPPORTUNITY_TYPES } from '../lib/utils'
import { TYPE_TO_AREA } from '../lib/sampleFeed'

/** Always-on status for Matches / Moves — what Pathfinder is watching. */
export default function StatusStrip({ profile, scrapedLabel = 'last scraped recently' }) {
  const summary = useMemo(() => {
    const types = profile?.desired_types || []
    const areas = [...new Set(types.map((t) => TYPE_TO_AREA[t]).filter(Boolean))]
    const loc = profile?.location?.trim()
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
      const all = OPPORTUNITY_TYPES.length
      return `${all} categories available`
    }
    return areas.join(' · ')
  }, [profile])

  return (
    <div className="mb-8 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-4">
      <div>
        <p className="font-display text-lg text-ink">{summary}</p>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-label">
          {areaHint} · {scrapedLabel}
        </p>
      </div>
      <Link to="/profile" className="text-sm text-teal hover:text-teal-dark">
        Sharpen profile
      </Link>
    </div>
  )
}
