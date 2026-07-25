import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

/**
 * Alo alo landing v2 — four intent buckets, three-stage engine,
 * listings vs moves, ingestion strip. Live demo wired to register/login.
 */

const BUCKETS = [
  {
    id: 'advancement',
    name: 'Advancement',
    blurb: 'Roles and placements you step into.',
    categories: [
      { name: 'Jobs', status: 'built' },
      { name: 'Internships', status: 'built' },
      { name: 'Attachments', status: 'built', tag: 'REQUIRES SIGN-OFF' },
    ],
  },
  {
    id: 'funding',
    name: 'Funding',
    blurb: 'Money that comes with a proposal attached.',
    categories: [
      { name: 'Research grants & fellowships', status: 'opening', tag: 'OPENING NOW' },
      { name: 'Accelerators & pitch funding', status: 'range' },
    ],
  },
  {
    id: 'knowledge',
    name: 'Knowledge',
    blurb: 'Structured learning, not just information.',
    categories: [
      { name: 'Scholarships & short courses', status: 'range' },
      { name: 'Residencies & cultural exchange', status: 'range' },
    ],
  },
  {
    id: 'networking',
    name: 'Networking',
    blurb: 'Access to people, not just postings.',
    categories: [
      { name: 'Conferences & mentorships', status: 'range' },
      { name: 'Civic & advocacy work', status: 'range' },
    ],
  },
]

const STAGES = [
  {
    tag: 'Stage one',
    title: 'Eligibility',
    angle: -35,
    caption: 'filtering…',
    copy: "Citizenship, location, budget, visa status. Binary — a listing either can be shown to you or it can't. Nothing here is a soft preference.",
  },
  {
    tag: 'Stage two',
    title: 'ROI score',
    angle: 15,
    caption: 'weighing…',
    copy: 'Value against effort, scored differently per category — a fellowship trades months of application work for years of funding; a job trades a resume tweak for a monthly salary. One formula per bucket, not one formula for everything.',
  },
  {
    tag: 'Stage three',
    title: 'Why this matters',
    angle: 0,
    caption: 'settled.',
    copy: 'Never a raw link. “Because you\'re in your third year of a BCom and said fieldwork, not a desk” — the reasoning is the product, not the listing.',
  },
]

const INGESTION_SOURCES = [
  { label: 'API', detail: 'Eventbrite, LinkedIn, GitHub, Crossref' },
  { label: 'Scrape', detail: 'University, government, and ATS pages' },
  { label: 'PDF parse', detail: 'Grant notices, NGO annual reports' },
  { label: 'Social listening', detail: 'Reddit, X, Discord — before it\'s “official”' },
]

const DEMO_CARDS = [
  {
    keys: ['research', 'fellowship', 'grant', 'funding', 'phd', 'biotech'],
    title: 'Biotech research fellowship',
    subtitle: 'Nairobi · Research and innovation',
  },
  {
    keys: ['job', 'remote', 'software', 'backend', 'engineer', 'career', 'hiring'],
    title: 'Junior backend developer',
    subtitle: 'Remote · Employment and career',
  },
  {
    keys: ['internship', 'intern', 'attachment', 'experiential'],
    title: 'Industrial attachment — finance',
    subtitle: 'Nairobi · Experiential learning',
  },
  {
    keys: ['mentorship', 'mentor', 'conference', 'networking'],
    title: 'Product leaders summit (scholarship seats)',
    subtitle: 'Lagos · Professional development',
  },
  {
    keys: ['scholarship', 'study', 'academic', 'course'],
    title: 'STEM PhD scholarship — diaspora track',
    subtitle: 'Europe · Academic and educational',
  },
  {
    keys: ['startup', 'accelerator', 'entrepreneur', 'pitch'],
    title: 'Campus founders accelerator',
    subtitle: 'Nairobi · Entrepreneurship',
  },
]

const HINTS = ['research grant', 'remote job', 'mentorship', 'attachment']

function matchDemo(query) {
  const q = query.trim().toLowerCase()
  if (!q) return null
  for (const card of DEMO_CARDS) {
    if (card.keys.some((k) => q.includes(k) || k.includes(q))) return card
  }
  const words = q.split(/\s+/).filter(Boolean)
  for (const card of DEMO_CARDS) {
    if (words.some((w) => card.keys.some((k) => k.includes(w) || w.includes(k)))) return card
  }
  return null
}

function LandingCompassMark({ size = 68 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 68 68" fill="none" aria-hidden="true">
      <circle cx="34" cy="34" r="32" fill="#5b7cfa" stroke="#1c2550" strokeWidth="3" />
      <path d="M34 16 L40 34 L34 52 L28 34 Z" fill="#0a0a0e" />
      <circle cx="34" cy="34" r="2.4" fill="#5b7cfa" />
    </svg>
  )
}

function Needle({ angle }) {
  return (
    <svg width={140} height={140} viewBox="0 0 140 140" fill="none" aria-hidden="true">
      <circle cx="70" cy="70" r="66" stroke="#26262f" strokeWidth="1.5" />
      <circle cx="70" cy="70" r="3" fill="#5b7cfa" />
      <g
        style={{
          transformOrigin: '70px 70px',
          transform: `rotate(${angle}deg)`,
          transition: 'transform 1.1s cubic-bezier(.2,.8,.2,1)',
        }}
      >
        <path d="M70 20 L76 70 L70 120 L64 70 Z" fill="#5b7cfa" opacity="0.9" />
      </g>
    </svg>
  )
}

function Stage({ data, active, registerRef }) {
  return (
    <div
      ref={registerRef}
      data-angle={data.angle}
      data-caption={data.caption}
      className={`border-b border-neutral-900 py-8 transition-opacity duration-500 last:border-b-0 ${
        active ? 'opacity-100' : 'opacity-35'
      }`}
    >
      <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-[#5b7cfa]">
        {data.tag}
      </span>
      <h3
        className="mb-2 text-xl font-medium"
        style={{ fontFamily: 'var(--landing-serif)' }}
      >
        {data.title}
      </h3>
      <p className="max-w-md text-sm text-neutral-400">{data.copy}</p>
    </div>
  )
}

function statusStyles(status) {
  switch (status) {
    case 'built':
      return { textClass: 'text-neutral-200', dot: 'bg-[#5b7cfa]' }
    case 'opening':
      return { textClass: 'text-neutral-200', dot: 'bg-[#8ea2ff]' }
    default:
      return { textClass: 'text-neutral-500', dot: 'bg-neutral-700' }
  }
}

function BucketCard({ bucket }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-[#131318] p-6">
      <div className="mb-1 flex items-baseline justify-between">
        <h4 className="text-xl font-medium" style={{ fontFamily: 'var(--landing-serif)' }}>
          {bucket.name}
        </h4>
        <span className="font-mono text-[11px] text-neutral-600">
          {bucket.categories.length} tagged
        </span>
      </div>
      <p className="mb-5 text-sm text-neutral-500">{bucket.blurb}</p>
      <ul className="space-y-3">
        {bucket.categories.map((c) => {
          const s = statusStyles(c.status)
          return (
            <li key={c.name} className="flex items-center gap-2.5">
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
              <span className={`text-sm ${s.textClass}`}>{c.name}</span>
              {c.tag && (
                <span
                  className="ml-auto rounded px-2 py-0.5 font-mono text-[10px] tracking-wide"
                  style={{
                    background: '#1c2550',
                    color: '#b9c6ff',
                    border: '1px solid #2c3970',
                  }}
                >
                  {c.tag}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const ctaPrimary =
  'rounded-full bg-[#5b7cfa] px-7 py-3 text-sm font-semibold text-neutral-950 transition hover:brightness-110'
const ctaSecondary =
  'rounded-full border border-neutral-700 px-7 py-3 text-sm font-semibold transition hover:border-neutral-500'

export default function Landing() {
  const [query, setQuery] = useState('')
  const demo = useMemo(() => matchDemo(query), [query])
  const [activeStage, setActiveStage] = useState(0)
  const [needleAngle, setNeedleAngle] = useState(STAGES[0].angle)
  const [needleCaption, setNeedleCaption] = useState(STAGES[0].caption)
  const stageRefs = useRef([])
  const waveBars = useRef([
    6, 14, 22, 10, 26, 18, 8, 20, 12, 24, 16, 9, 22, 14, 6, 18, 10, 24, 8, 16,
  ])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = stageRefs.current.indexOf(entry.target)
            if (idx !== -1) {
              setActiveStage(idx)
              setNeedleAngle(STAGES[idx].angle)
              setNeedleCaption(STAGES[idx].caption)
            }
          }
        })
      },
      { threshold: 0.55, rootMargin: '-10% 0px -30% 0px' },
    )
    stageRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div
      className="landing-v2 min-h-screen text-neutral-100"
      style={{
        background: '#0a0a0e',
        fontFamily: 'var(--landing-sans)',
        '--landing-serif': "'Fraunces', Georgia, serif",
        '--landing-sans': "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* HERO */}
      <section className="px-8 pb-20 pt-24 text-center">
        <div className="mb-9 flex justify-center">
          <LandingCompassMark />
        </div>
        <h1
          className="mx-auto mb-5 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl"
          style={{ fontFamily: 'var(--landing-serif)' }}
        >
          Alo alo. We&apos;ll find what fits.
        </h1>
        <p className="mx-auto mb-9 max-w-xl text-lg text-neutral-400">
          Advancement, funding, knowledge, and networking — matched to you instead of scattered
          across a dozen single-purpose sites.
        </p>
        <div className="mb-14 flex flex-wrap justify-center gap-3">
          <Link to="/register" className={ctaPrimary}>
            Get started
          </Link>
          <Link to="/login" className={ctaSecondary}>
            Sign in
          </Link>
        </div>
        <div className="mx-auto max-w-xl rounded-3xl border border-neutral-800 bg-[#131318] px-8 py-10">
          <p className="mb-4 text-sm text-neutral-400">Try it — type what you&apos;re looking for</p>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. research grant, remote job, mentorship"
            className="w-full rounded-xl border border-neutral-800 bg-[#0a0a0e] px-4 py-3 text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-[#5b7cfa]"
            aria-label="Demo search"
          />
          <div className="relative mt-5 min-h-20">
            {!demo && (
              <div className="text-xs text-neutral-600">
                <b className="font-medium text-neutral-400">Try</b>{' '}
                {HINTS.map((h, i) => (
                  <button
                    key={h}
                    type="button"
                    className="text-[#5b7cfa] hover:underline"
                    onClick={() => setQuery(h)}
                  >
                    {h}
                    {i < HINTS.length - 1 ? ', ' : ''}
                  </button>
                ))}
              </div>
            )}
            {demo && (
              <article className="ease-rise rounded-xl border border-neutral-800 bg-[#0a0a0e] p-4 text-left">
                <div className="mb-3 flex justify-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#5b7cfa]" />
                </div>
                <h2 className="text-base text-neutral-100">{demo.title}</h2>
                <p className="mt-1 text-sm text-neutral-400">{demo.subtitle}</p>
                <p className="mt-4 text-xs text-neutral-600">
                  Example match —{' '}
                  <Link to="/register" className="text-[#5b7cfa] hover:underline">
                    create an account
                  </Link>{' '}
                  to see opportunities that fit you.
                </p>
              </article>
            )}
          </div>
        </div>
      </section>

      {/* INGESTION STRIP */}
      <section className="border-t border-neutral-900 px-8 py-10">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 md:grid-cols-4">
          {INGESTION_SOURCES.map((s) => (
            <div key={s.label} className="text-center md:text-left">
              <div className="mb-1 font-mono text-[11px] uppercase tracking-wide text-[#5b7cfa]">
                {s.label}
              </div>
              <div className="text-xs text-neutral-500">{s.detail}</div>
            </div>
          ))}
        </div>
      </section>

      {/* MECHANISM */}
      <section className="border-t border-neutral-900 px-8 py-24">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <span className="font-mono text-xs uppercase tracking-wider text-neutral-500">
            How it points you
          </span>
          <h2
            className="mt-2 text-3xl font-semibold"
            style={{ fontFamily: 'var(--landing-serif)' }}
          >
            Eligibility, then ROI, then the reason why
          </h2>
          <p className="mt-3 text-neutral-400">
            The three-stage engine underneath the compass, not a metaphor standing in for it.
          </p>
        </div>
        <div className="mx-auto grid max-w-4xl grid-cols-1 items-start gap-10 md:grid-cols-[220px_1fr]">
          <div className="sticky top-24 flex flex-row items-center justify-center gap-4 md:flex-col">
            <Needle angle={needleAngle} />
            <div className="min-h-4 text-center font-mono text-xs text-neutral-500">
              {needleCaption}
            </div>
          </div>
          <div>
            {STAGES.map((s, i) => (
              <Stage
                key={s.tag}
                data={s}
                active={activeStage === i}
                registerRef={(el) => {
                  stageRefs.current[i] = el
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* FOUR BUCKETS */}
      <section className="border-t border-neutral-900 px-8 py-24">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <span className="font-mono text-xs uppercase tracking-wider text-neutral-500">
            What it finds
          </span>
          <h2
            className="mt-2 text-3xl font-semibold"
            style={{ fontFamily: 'var(--landing-serif)' }}
          >
            Four buckets, eight categories tagged inside them
          </h2>
          <p className="mt-3 text-neutral-400">
            Built wide against all eight. Live listings today sit in Advancement, with Funding
            opening next.
          </p>
        </div>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2">
          {BUCKETS.map((b) => (
            <BucketCard key={b.id} bucket={b} />
          ))}
        </div>
      </section>

      {/* LISTINGS VS MOVES */}
      <section className="border-t border-neutral-900 px-8 py-24">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <span className="font-mono text-xs uppercase tracking-wider text-neutral-500">
            Two feeds, not one
          </span>
          <h2
            className="mt-2 text-3xl font-semibold"
            style={{ fontFamily: 'var(--landing-serif)' }}
          >
            Most of the good ones are never posted
          </h2>
          <p className="mt-3 text-neutral-400">
            A large share of real opportunities get filled through a call, an intro, a follow-up —
            not a listing. Alo alo surfaces both.
          </p>
        </div>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-neutral-800 bg-[#131318] p-7">
            <span className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
              Listings
            </span>
            <h4
              className="mt-2 mb-3 text-xl font-medium"
              style={{ fontFamily: 'var(--landing-serif)' }}
            >
              Open and deadline-bound
            </h4>
            <p className="mb-4 text-sm text-neutral-400">
              Jobs, attachments, grants, and programs that are publicly postable — scraped,
              verified, and re-checked so nothing expired quietly shows up as live.
            </p>
            <div className="font-mono text-xs text-neutral-600">
              e.g. &quot;Audit associate — Nairobi, closes Aug 14&quot;
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-[#131318] p-7">
            <span className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
              Moves
            </span>
            <h4
              className="mt-2 mb-3 text-xl font-medium"
              style={{ fontFamily: 'var(--landing-serif)' }}
            >
              Relationship-shaped, no listing required
            </h4>
            <p className="mb-4 text-sm text-neutral-400">
              A suggested next step from the way people actually land these — an intro message, a
              follow-up prompt, a name worth cold-emailing.
            </p>
            <div className="font-mono text-xs text-neutral-600">
              e.g. &quot;3 speakers at this conference work in your field — here&apos;s a two-line
              intro&quot;
            </div>
          </div>
        </div>
      </section>

      {/* PROOF */}
      <section className="border-t border-neutral-900 px-8 py-16">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <span className="font-mono text-xs uppercase tracking-wider text-neutral-500">
            Alo alo, this is new
          </span>
          <h2
            className="mt-2 text-3xl font-semibold"
            style={{ fontFamily: 'var(--landing-serif)' }}
          >
            We&apos;re early. Here&apos;s one real call.
          </h2>
        </div>
        <div className="mx-auto max-w-xl rounded-2xl border border-neutral-800 bg-[#131318] px-8 py-7">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[#5b7cfa]" />
            <span className="font-mono text-xs text-neutral-500">
              VOICE NOTE · 0:47 · 3RD YEAR, BCOM, MOI UNIVERSITY
            </span>
          </div>
          <div className="mb-5 flex h-6 items-end gap-[3px]">
            {waveBars.current.map((h, i) => (
              <span
                key={i}
                className="w-[3px] rounded bg-[#5b7cfa]"
                style={{ height: `${h}px`, opacity: 0.55 }}
              />
            ))}
          </div>
          <blockquote
            className="text-lg leading-relaxed"
            style={{ fontFamily: 'var(--landing-serif)' }}
          >
            &quot;I typed &apos;attachment, finance&apos; at midnight not expecting much. Got a call
            two days later about a slot at a Nairobi audit firm that actually matched my course
            dates. Supervisor sign-off was sorted before my first day.&quot;
          </blockquote>
          <div className="mt-5 text-sm text-neutral-400">
            <b className="font-semibold text-neutral-100">Faith W.</b> — matched in 6 days,
            attachment ongoing
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="border-t border-neutral-900 px-8 py-16">
        <p className="mx-auto max-w-xl text-center text-sm text-neutral-600">
          Built with local universities, regional employers, and a small number of exchange partners
          — matches pulled from what they&apos;re actually posting, not a database we last touched
          in June.
        </p>
      </section>

      {/* CLOSING CTA */}
      <section className="border-t border-neutral-900 px-8 py-24 text-center">
        <span className="font-mono text-xs uppercase tracking-wider text-neutral-500">Alo alo</span>
        <h2
          className="mt-3 mb-3 text-4xl font-semibold"
          style={{ fontFamily: 'var(--landing-serif)' }}
        >
          We&apos;ll call you back.
        </h2>
        <p className="mb-8 text-neutral-400">Three questions, then we start pointing.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/register" className={ctaPrimary}>
            Get started
          </Link>
          <Link to="/login" className={ctaSecondary}>
            Sign in
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-neutral-900 px-8 pb-10 pt-16">
        <div className="mx-auto mb-12 grid max-w-4xl grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 flex flex-col gap-3 md:col-span-1">
            <LandingCompassMark size={30} />
            <p className="max-w-[220px] text-sm text-neutral-600">
              A compass for advancement, funding, knowledge, and networking. Alo alo.
            </p>
          </div>
          <div>
            <span className="mb-3 block font-mono text-[11px] tracking-wide text-[#5b7cfa]">
              N — FIND
            </span>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>
                <a href="#buckets" className="hover:text-neutral-100" onClick={(e) => e.preventDefault()}>
                  Advancement
                </a>
              </li>
              <li>
                <span className="hover:text-neutral-100">Funding</span>
              </li>
              <li>
                <span className="hover:text-neutral-100">Knowledge</span>
              </li>
              <li>
                <span className="hover:text-neutral-100">Networking</span>
              </li>
            </ul>
          </div>
          <div>
            <span className="mb-3 block font-mono text-[11px] tracking-wide text-[#5b7cfa]">
              E — ABOUT
            </span>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>
                <Link to="/how-it-works" className="hover:text-neutral-100">
                  How matching works
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-neutral-100">
                  Get started
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <span className="mb-3 block font-mono text-[11px] tracking-wide text-[#5b7cfa]">
              S — PARTNERS
            </span>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>
                <span className="text-neutral-600">For employers</span>
              </li>
              <li>
                <span className="text-neutral-600">For universities</span>
              </li>
              <li>
                <span className="text-neutral-600">Privacy</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto flex max-w-4xl flex-wrap justify-between gap-3 border-t border-neutral-900 pt-6 text-xs text-neutral-600">
          <span>© 2026 Alo alo</span>
          <span>Nairobi</span>
        </div>
      </footer>
    </div>
  )
}
