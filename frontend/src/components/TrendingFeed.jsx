import { ChevronRight } from 'lucide-react'
import { typeMeta } from '../lib/utils'
import { TRENDING_LISTINGS } from '../lib/sampleFeed'
import { formatLocation } from '../lib/location'

const CATEGORY_LABEL = {
  academic: 'Scholarships & short courses',
  employment: 'Jobs',
  research: 'Research grants & fellowships',
  professional_dev: 'Professional development',
  experiential: 'Internships',
  social_impact: 'Social impact',
  entrepreneurship: 'Accelerators & pitch funding',
  cultural_exchange: 'Conferences & mentorships',
}

function toFeedItem(item) {
  if (item.cat && item.title && item.meta) {
    return {
      id: item.id || item.title,
      cat: item.cat,
      title: item.title,
      meta: item.meta,
      badge: item.badge || 'example',
    }
  }
  const place = formatLocation(item.location)
  const typeLabel = CATEGORY_LABEL[item.category] || typeMeta(item.category).short
  const meta =
    item.meta ||
    [place, item.organization].filter(Boolean).join(' · ') ||
    typeLabel
  return {
    id: item.id || item.title,
    cat: typeLabel,
    title: item.title,
    meta,
    badge: item.badge || 'trending',
  }
}

function badgeLabel(badge) {
  if (badge === 'live_match' || badge === 'match') return 'Live match'
  if (badge === 'trending') return 'Trending'
  return 'Example'
}

/**
 * Ambient / personal feed. Prefer live API items; fall back to Example placeholders.
 */
export default function TrendingFeed({
  title = 'Trending in your categories',
  items,
  limit = 4,
  live = false,
}) {
  const source = items?.length ? items : TRENDING_LISTINGS
  const list = source.slice(0, limit).map(toFeedItem)
  const usingExamples = !items?.length
  const sectionBadge = usingExamples ? 'Example' : live ? 'Live match' : 'Trending'

  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl text-ink">{title}</h2>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted">
          · {sectionBadge}
        </span>
      </div>
      <ul className="overflow-hidden rounded-[12px] border border-border bg-card">
        {list.map((item, i) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-4 px-5 py-4"
            style={{
              borderBottom: i === list.length - 1 ? 'none' : '1px solid var(--pf-border)',
            }}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-[11px] uppercase tracking-widest text-trail-gold">
                  {item.cat}
                </p>
                {!usingExamples && (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                    {badgeLabel(item.badge)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-ink">{item.title}</p>
              <p className="mt-0.5 text-xs text-muted">{item.meta}</p>
            </div>
            <ChevronRight size={16} className="mt-1 shrink-0 text-muted" aria-hidden="true" />
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">
        {usingExamples
          ? 'Example trail until live listings land — save matches and Dust will replace these with yours.'
          : 'Listings from the latest scrape, filtered away from your personal matches.'}
      </p>
    </section>
  )
}
