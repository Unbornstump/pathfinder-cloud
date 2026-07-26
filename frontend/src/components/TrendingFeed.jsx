import { ChevronRight } from 'lucide-react'
import { TRENDING_LISTINGS } from '../lib/sampleFeed'

/** Ambient feed — real-feeling listings so empty personal slots aren't the whole page. */
export default function TrendingFeed({
  title = 'Trending in your categories',
  items = TRENDING_LISTINGS,
  limit = 4,
}) {
  const list = items.slice(0, limit)
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl text-ink">{title}</h2>
        <span className="font-mono text-[10px] uppercase tracking-widest text-dust-moss">
          · live sample
        </span>
      </div>
      <ul className="overflow-hidden rounded-[12px] border border-border bg-card">
        {list.map((item, i) => (
          <li
            key={item.title}
            className="flex items-start justify-between gap-4 px-5 py-4"
            style={{
              borderBottom: i === list.length - 1 ? 'none' : '1px solid var(--pf-border)',
            }}
          >
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-widest text-trail-gold">
                {item.cat}
              </p>
              <p className="mt-1 text-sm text-ink">{item.title}</p>
              <p className="mt-0.5 text-xs text-muted">{item.meta}</p>
            </div>
            <ChevronRight size={16} className="mt-1 shrink-0 text-muted" />
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-label">
        Sample trail until your scrape settles — save matches and Dust will replace these with
        yours.
      </p>
    </section>
  )
}
