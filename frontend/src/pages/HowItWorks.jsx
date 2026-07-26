import { Link } from 'react-router-dom'
import { CompassMark } from '../components/CompassMark'
import ThemeToggle from '../components/ThemeToggle'

export default function HowItWorks() {
  return (
    <div className="relative min-h-screen bg-page px-4 py-16">
      <div className="absolute right-4 top-4 md:right-8 md:top-6">
        <ThemeToggle />
      </div>
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex justify-center">
          <Link to="/">
            <CompassMark size={48} />
          </Link>
        </div>
        <h1 className="mb-4 text-center text-2xl text-ink">How Pathfinder points you</h1>
        <p className="mb-10 text-center text-sm text-muted">
          Three stages before anything reaches your feed — so you never get a raw link dump.
        </p>

        <ol className="space-y-8">
          <li>
            <h2 className="mb-2 text-base text-ink">1. Eligibility</h2>
            <p className="text-sm leading-relaxed text-muted">
              Hard constraints first: citizenship, location, budget, visa, and open deadlines. If
              it cannot apply to you, it never appears — no scoring theater.
            </p>
          </li>
          <li>
            <h2 className="mb-2 text-base text-ink">2. ROI by category</h2>
            <p className="text-sm leading-relaxed text-muted">
              A fellowship&apos;s effort-to-value math is not a job&apos;s. We score research,
              employment, and experiential paths with separate formulas so trust stays intact.
            </p>
          </li>
          <li>
            <h2 className="mb-2 text-base text-ink">3. Why this matters</h2>
            <p className="text-sm leading-relaxed text-muted">
              Every match ships with a one- or two-line reason grounded in your tags, location, or
              inferred ambition — never just a title and a URL.
            </p>
          </li>
          <li>
            <h2 className="mb-2 text-base text-ink">Moves, not only listings</h2>
            <p className="text-sm leading-relaxed text-muted">
              For research and funding, we also suggest relationship actions: intro drafts,
              networking targets, and follow-ups — because many real opportunities are never
              posted.
            </p>
          </li>
        </ol>

        <div className="mt-12 flex justify-center gap-4">
          <Link to="/register" className="rounded-full bg-teal px-5 py-2 text-sm text-white hover:bg-teal-dark">
            Get started
          </Link>
          <Link to="/" className="rounded-full border border-border-strong px-5 py-2 text-sm text-ink">
            Back
          </Link>
        </div>
      </div>
    </div>
  )
}
