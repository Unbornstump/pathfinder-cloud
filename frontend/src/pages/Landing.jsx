import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Sparkles, Compass, ChevronRight } from 'lucide-react'
import DustAvatar from '../components/DustAvatar'
import PathfinderNavActions, { DustMoteIcon } from '../components/PathfinderNavActions'

/* ---------------------------------- data ---------------------------------- */

const LIVE_FEED = [
  { time: '2m ago', cat: 'JOB', title: 'Audit Associate, Nairobi · closes Aug 14' },
  { time: '14m ago', cat: 'GRANT', title: 'Mastercard Foundation research grant · closes Sep 2' },
  { time: '41m ago', cat: 'ATTACHMENT', title: 'KCB finance attachment, Q4 intake' },
  { time: '1h ago', cat: 'MATCH', title: '3 DevFest speakers work in your field — intro drafted' },
  { time: '3h ago', cat: 'COURSE', title: 'DAAD short course, data science · fully funded' },
  { time: '5h ago', cat: 'MATCH', title: '2 alumni at Safaricom — cold email drafted' },
  { time: '6h ago', cat: 'ACCELERATOR', title: 'Antler East Africa Cohort 6 · applications open' },
  { time: '8h ago', cat: 'RESIDENCY', title: 'Alliance Française residency, 6 weeks' },
]

const AREAS = [
  {
    name: 'Advancement',
    tag: '3 tagged',
    desc: 'A role or placement you step straight into.',
    items: ['Jobs', 'Internships', 'Attachments'],
    note: 'Attachments require supervisor sign-off',
  },
  {
    name: 'Funding',
    tag: '2 tagged',
    desc: 'Money that comes with a proposal attached — you apply, you don’t just show up.',
    items: ['Research grants & fellowships', 'Accelerators & pitch funding'],
    note: 'Research grants — opening now',
  },
  {
    name: 'Knowledge',
    tag: '2 tagged',
    desc: 'Structured learning with a certificate or credential at the end, not just a video.',
    items: ['Scholarships & short courses', 'Residencies & cultural exchange'],
    note: null,
  },
  {
    name: 'Networking',
    tag: '2 tagged',
    desc: 'A door to a person, not a posting — mentors, panels, rooms worth being in.',
    items: ['Conferences & mentorships', 'Civic & advocacy work'],
    note: null,
  },
]

const STAGES = [
  {
    n: '01',
    label: 'Can you even apply?',
    body: "Citizenship, location, budget, visa status. This is binary — a listing either can be shown to you or it can't. No point surfacing a fellowship you're not eligible for.",
  },
  {
    n: '02',
    label: 'Is it worth your time?',
    body: 'Weighed differently per area — a fellowship trades weeks of proposal-writing for years of funding; a job trades a resume tweak for a monthly salary. Dust weighs the trade, not just the headline.',
  },
  {
    n: '03',
    label: 'Why this one, for you',
    body: 'Never a raw link. “Because you\'re in your third year of a BCom and said fieldwork, not a desk” — the reasoning is the product, the listing is just the payload.',
  },
]

const SECTION_LABELS = {
  hero: 'start here',
  live: 'fresh listings',
  areas: 'four areas',
  stages: 'how it decides',
  dust: 'ask dust',
  footer: 'end of the map',
}

const CHIPS = ['research grant', 'remote job', 'mentorship', 'attachment finance']

/** One playful placeholder card — echoes the query; never pretends to be live. */
function buildTeaserCard(rawQuery) {
  const q = rawQuery.trim()
  const short = q.length > 42 ? `${q.slice(0, 40)}…` : q
  const lower = q.toLowerCase()
  const placeHint =
    lower.match(/\bin\s+([a-z][a-z\s-]{1,24})/)?.[1]?.trim() ||
    lower.match(/\b(nairobi|mombasa|kisumu|meru|roysambu|remote)\b/)?.[1] ||
    'somewhere'
  const place = placeHint.charAt(0).toUpperCase() + placeHint.slice(1)

  return {
    title: `${short} — somewhere, probably`,
    meta: `Looks promising near ${place} · details blurred on purpose`,
  }
}

/* -------------------------------- component -------------------------------- */

export default function Landing() {
  const [query, setQuery] = useState('')
  const [teaserOpen, setTeaserOpen] = useState(false)
  const [visibleAreas, setVisibleAreas] = useState(() => Array(AREAS.length).fill(false))
  const [activeSection, setActiveSection] = useState('hero')
  const [scrollProgress, setScrollProgress] = useState(0)
  const [needleAngle, setNeedleAngle] = useState(135)
  const [compassDocked, setCompassDocked] = useState(false)
  const [compassTraveling, setCompassTraveling] = useState(false)
  const [compassPos, setCompassPos] = useState({ left: 24, top: 18, ready: false })
  const [moteMenuOpen, setMoteMenuOpen] = useState(false)

  const canvasRef = useRef(null)
  const heroRef = useRef(null)
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const areaRefs = useRef([])
  const sectionRefs = useRef({})
  const headerCompassSlotRef = useRef(null)
  const lastScrollY = useRef(0)
  const targetAngle = useRef(135)
  const idleTimer = useRef(null)
  const rafId = useRef(null)
  const travelTimer = useRef(null)
  const compassDockedRef = useRef(false)
  const teaserPauseTimer = useRef(null)

  const q = query.trim()
  const teaser = teaserOpen && q ? buildTeaserCard(q) : null

  useEffect(() => {
    return () => clearTimeout(teaserPauseTimer.current)
  }, [])

  function onSearchChange(value) {
    setQuery(value)
    clearTimeout(teaserPauseTimer.current)
    if (!value.trim()) {
      setTeaserOpen(false)
      return
    }
    teaserPauseTimer.current = setTimeout(() => setTeaserOpen(true), 480)
  }

  function onSearchKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      clearTimeout(teaserPauseTimer.current)
      if (query.trim()) setTeaserOpen(true)
    }
  }

  function applyChip(chip) {
    setQuery(chip)
    clearTimeout(teaserPauseTimer.current)
    setTeaserOpen(true)
  }

  /* ambient dust canvas — dense field with soft magnetic pull toward the cursor */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf
    let w
    let h

    const CREAM = '#F6F4EC'
    const AMBER = '#d99a5c'
    const BLUE = '#6b8fd4'

    function pickColor() {
      const roll = Math.random()
      if (roll < 0.7) return CREAM
      if (roll < 0.9) return AMBER
      return BLUE
    }

    function makeParticles() {
      const count = reduceMotion ? 0 : 55
      return Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: 1 + Math.random() * 2.5,
        color: pickColor(),
        alpha: 0.15 + Math.random() * 0.5,
      }))
    }

    let particles = []

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect()
      w = canvas.width = Math.max(1, Math.floor(rect.width))
      h = canvas.height = Math.max(1, Math.floor(rect.height))
      particles = makeParticles()
    }

    function tick() {
      ctx.clearRect(0, 0, w, h)
      const m = mouseRef.current
      particles.forEach((p) => {
        const dx = m.x - p.x
        const dy = m.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 170) {
          const force = ((170 - dist) / 170) * 0.035
          p.vx += (dx / (dist || 1)) * force
          p.vy += (dy / (dist || 1)) * force
        }
        p.vx *= 0.975
        p.vy *= 0.975
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = w
        if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h
        if (p.y > h) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.alpha
        ctx.fill()
      })
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(tick)
    }

    resize()
    window.addEventListener('resize', resize)
    if (!reduceMotion) tick()

    const heroEl = heroRef.current
    function onMove(e) {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    function onLeave() {
      mouseRef.current = { x: -9999, y: -9999 }
    }
    heroEl?.addEventListener('mousemove', onMove)
    heroEl?.addEventListener('mouseleave', onLeave)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      heroEl?.removeEventListener('mousemove', onMove)
      heroEl?.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  /* areas settle into view */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.dataset.idx)
            setVisibleAreas((prev) => {
              if (prev[idx]) return prev
              const next = [...prev]
              next[idx] = true
              return next
            })
          }
        })
      },
      { threshold: 0.3 },
    )
    areaRefs.current.forEach((el) => el && obs.observe(el))
    return () => obs.disconnect()
  }, [])

  /* section spy + roaming needle + single traveling compass */
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const narrow = window.matchMedia('(max-width: 640px)')
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.dataset.section)
        })
      },
      { threshold: 0.45 },
    )
    Object.values(sectionRefs.current).forEach((el) => el && obs.observe(el))

    function measureCompass(docked, progress) {
      const slot = headerCompassSlotRef.current
      if (!slot) return
      const rect = slot.getBoundingClientRect()
      if (narrow.matches) {
        setCompassPos({ left: rect.left, top: rect.top, ready: true })
        return
      }
      if (!docked) {
        setCompassPos({ left: rect.left, top: rect.top, ready: true })
        return
      }
      const dockLeft = 20
      const dockTop = window.innerHeight * (0.14 + progress * 0.66)
      setCompassPos({ left: dockLeft, top: dockTop, ready: true })
    }

    function onScroll() {
      const y = window.scrollY
      const max = document.documentElement.scrollHeight - window.innerHeight
      const progress = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0
      setScrollProgress(progress)

      const shouldDock = !narrow.matches && y > 64
      if (shouldDock !== compassDockedRef.current) {
        compassDockedRef.current = shouldDock
        setCompassDocked(shouldDock)
        if (!reduceMotion) {
          setCompassTraveling(true)
          clearTimeout(travelTimer.current)
          travelTimer.current = setTimeout(() => setCompassTraveling(false), 340)
        }
      }
      measureCompass(shouldDock, progress)

      if (reduceMotion) return
      const delta = y - lastScrollY.current
      lastScrollY.current = y
      targetAngle.current += delta * 1.6
      clearTimeout(idleTimer.current)
      idleTimer.current = setTimeout(() => {
        const resting = Math.round(targetAngle.current / 360) * 360 + 135
        targetAngle.current = resting
      }, 650)
    }

    function onResize() {
      measureCompass(compassDockedRef.current, scrollProgress)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)

    let tickRaf = null
    if (!reduceMotion) {
      function tick() {
        setNeedleAngle((a) => a + (targetAngle.current - a) * 0.08)
        tickRaf = requestAnimationFrame(tick)
      }
      tickRaf = requestAnimationFrame(tick)
      rafId.current = tickRaf
    }

    return () => {
      obs.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(tickRaf)
      clearTimeout(idleTimer.current)
      clearTimeout(travelTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function scrollToDust() {
    sectionRefs.current.dust?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const compassSize = compassDocked ? 44 : 18
  const iconSize = compassDocked ? 20 : 18
  const showCompassChrome = compassDocked

  return (
    <div className="landing-v2 f-body relative min-h-screen w-full">
      {/* One compass — travels between header wordmark and floating dock */}
      <button
        type="button"
        onClick={() => {
          if (compassDocked) scrollToDust()
          else window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        aria-label={compassDocked ? 'Jump to Dust' : 'Pathfinder home'}
        className={`compass-mascot fixed z-50 flex items-center gap-3 ${
          compassTraveling ? 'compass-traveling' : ''
        } ${compassDocked ? 'compass-docked' : 'compass-home'}`}
        style={{
          left: compassPos.ready ? compassPos.left : -999,
          top: compassPos.ready ? compassPos.top : -999,
          opacity: compassPos.ready ? 1 : 0,
          pointerEvents: compassPos.ready ? 'auto' : 'none',
        }}
      >
        <span
          className="compass-mascot-mark flex shrink-0 items-center justify-center"
          style={{
            width: compassSize,
            height: compassSize,
            borderRadius: showCompassChrome ? 9999 : 0,
            background: showCompassChrome ? 'var(--land-card)' : 'transparent',
            border: showCompassChrome ? '1px solid var(--land-border)' : 'none',
            boxShadow: showCompassChrome ? '0 4px 20px rgba(0,0,0,0.25)' : 'none',
          }}
        >
          <Compass
            size={iconSize}
            style={{
              color: 'var(--land-accent)',
              transform: compassDocked ? `rotate(${needleAngle}deg)` : undefined,
              transition: compassDocked ? 'transform 60ms linear' : undefined,
            }}
          />
        </span>
        {showCompassChrome ? (
          <span
            className="compass-mascot-label f-mono rounded-full px-2.5 py-1 text-[10px] uppercase tracking-widest"
            style={{
              background: 'var(--land-card)',
              border: '1px solid var(--land-border)',
              color: 'var(--land-muted)',
            }}
          >
            {SECTION_LABELS[activeSection] || 'exploring'}
          </span>
        ) : null}
      </button>

      {/* nav */}
      <header
        className="landing-header sticky top-0 z-40 backdrop-blur-md"
        style={{
          borderBottom: '1px solid var(--land-border)',
          background: 'color-mix(in srgb, var(--land-bg) 78%, transparent)',
        }}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span
              ref={headerCompassSlotRef}
              className="inline-block h-[18px] w-[18px] shrink-0"
              aria-hidden="true"
            />
            <span className="f-display truncate text-lg tracking-tight">Pathfinder</span>
          </Link>

          <div className="hidden md:block">
            <PathfinderNavActions />
          </div>

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border outline-none focus-visible:ring-2 focus-visible:ring-[var(--land-accent)] md:hidden"
            style={{ borderColor: 'var(--land-border)', color: '#d99a5c' }}
            aria-label={moteMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={moteMenuOpen}
            onClick={() => setMoteMenuOpen((o) => !o)}
          >
            <DustMoteIcon size={20} />
          </button>
        </div>

        <nav
          className="landing-section-nav f-mono flex gap-5 overflow-x-auto px-6 pb-3 text-xs uppercase tracking-widest"
          style={{ color: 'var(--land-muted)' }}
          aria-label="Areas"
        >
          <a href="#advancement" className="shrink-0 opacity-80 hover:opacity-100">
            Advancement
          </a>
          <a href="#funding" className="shrink-0 opacity-80 hover:opacity-100">
            Funding
          </a>
          <a href="#knowledge" className="shrink-0 opacity-80 hover:opacity-100">
            Knowledge
          </a>
          <a href="#networking" className="shrink-0 opacity-80 hover:opacity-100">
            Networking
          </a>
        </nav>

        <div
          className={`landing-mote-panel overflow-hidden md:hidden ${
            moteMenuOpen ? 'landing-mote-panel-open' : ''
          }`}
        >
          <div className="px-6 pb-4">
            <PathfinderNavActions stacked />
          </div>
        </div>
      </header>

      {/* hero */}
      <section
        ref={(el) => {
          heroRef.current = el
          sectionRefs.current.hero = el
        }}
        data-section="hero"
        className="relative overflow-hidden px-6 pb-24 pt-20"
      >
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0"
          style={{ width: '100%', height: '100%' }}
        />

        <div className="relative mx-auto max-w-3xl text-center">
          <p
            className="f-mono mb-5 text-xs uppercase tracking-[0.25em]"
            style={{ color: 'var(--land-gold)' }}
          >
            Alo alo — Pathfinder, guided by Dust
          </p>
          <h1 className="f-display mb-6 text-4xl leading-[1.05] sm:text-6xl">
            Tell Dust what you need.
            <br />
            It finds the way in.
          </h1>
          <p
            className="mx-auto mb-10 max-w-xl text-base sm:text-lg"
            style={{ color: 'var(--land-muted)' }}
          >
            Pathfinder matches you to jobs, grants, scholarships, and mentorships. Dust — the AI
            inside — checks what you qualify for and explains why each match fits. Sign in to talk
            to Dust.
          </p>

          <div className="relative mx-auto max-w-xl">
            <form
              className="field-shell flex items-center gap-3 rounded-full px-5 py-4"
              style={{ background: 'var(--land-card)', border: '1px solid var(--land-border)' }}
              onSubmit={(e) => {
                e.preventDefault()
                clearTimeout(teaserPauseTimer.current)
                if (query.trim()) setTeaserOpen(true)
              }}
            >
              <Search size={18} style={{ color: 'var(--land-muted)' }} aria-hidden="true" />
              <input
                value={query}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="e.g. medical lab jobs in Roysambu"
                className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-60 sm:text-base"
                style={{ color: 'var(--land-ink)' }}
                aria-label="Try a sample search"
              />
            </form>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => applyChip(c)}
                  className="f-mono rounded-full border px-3 py-1.5 text-xs opacity-80 hover:opacity-100"
                  style={{ borderColor: 'var(--land-border)', color: 'var(--land-accent)' }}
                >
                  {c}
                </button>
              ))}
            </div>

            {teaser ? (
              <div className="mt-10 text-left" aria-live="polite">
                <article
                  className="area-card overflow-hidden rounded-2xl px-5 py-5 sm:px-6 sm:py-6"
                  style={{
                    border: '1px solid var(--land-border)',
                    background: 'var(--land-card)',
                  }}
                >
                  <p
                    className="f-mono mb-3 text-[10px] uppercase tracking-widest"
                    style={{ color: 'var(--land-muted)' }}
                  >
                    Example
                  </p>
                  <p
                    className="f-display text-lg leading-snug sm:text-xl"
                    style={{
                      color: 'var(--land-ink)',
                      filter: 'blur(0.4px)',
                      opacity: 0.88,
                    }}
                  >
                    {teaser.title}
                  </p>
                  <p
                    className="f-body mt-2 text-sm leading-relaxed"
                    style={{
                      color: 'var(--land-muted)',
                      filter: 'blur(0.7px)',
                      opacity: 0.9,
                    }}
                  >
                    {teaser.meta}
                  </p>
                </article>

                <p
                  className="f-body mt-5 text-sm leading-relaxed sm:text-base"
                  style={{ color: 'var(--land-ink)' }}
                >
                  The real ones are hiding behind a login. Sign in and Dust will dig them up.
                </p>
                <Link
                  to="/register"
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium"
                  style={{ color: 'var(--land-accent)' }}
                >
                  Sign up to see real matches
                  <ChevronRight size={14} aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <p className="f-body mt-5 text-sm" style={{ color: 'var(--land-muted)' }}>
                Or skip the typing —{' '}
                <Link to="/register" className="underline" style={{ color: 'var(--land-accent)' }}>
                  sign up and tell Dust your situation
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* live feed */}
      <section
        ref={(el) => {
          sectionRefs.current.live = el
        }}
        data-section="live"
        className="px-6 py-14"
        style={{
          borderTop: '1px solid var(--land-border)',
          borderBottom: '1px solid var(--land-border)',
        }}
      >
        <div className="mx-auto mb-8 max-w-5xl text-center">
          <p
            className="f-mono mb-3 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.25em]"
            style={{ color: 'var(--land-live)' }}
          >
            <span
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ background: 'var(--land-live)' }}
            />
            Live — sample trail
          </p>
          <h2 className="f-display text-2xl sm:text-3xl">What Dust is finding right now.</h2>
        </div>

        <div className="overflow-hidden">
          <div className="marquee-track flex w-max gap-4">
            {[...LIVE_FEED, ...LIVE_FEED].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 whitespace-nowrap rounded-full px-5 py-3"
                style={{ background: 'var(--land-card)', border: '1px solid var(--land-border)' }}
              >
                <span className="f-mono text-[11px]" style={{ color: 'var(--land-muted)' }}>
                  {item.time}
                </span>
                <span
                  className="f-mono rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wider"
                  style={{
                    background: 'var(--land-badge-bg)',
                    color: 'var(--land-badge-ink)',
                  }}
                >
                  {item.cat}
                </span>
                <span className="text-sm">{item.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* four areas on a trail */}
      <section
        ref={(el) => {
          sectionRefs.current.areas = el
        }}
        data-section="areas"
        className="relative overflow-hidden px-6 py-24"
      >
        <div
          className="dust-dot"
          style={{ top: '10%', left: '8%', width: 4, height: 4, background: 'var(--land-gold)' }}
        />
        <div
          className="dust-dot"
          style={{
            top: '60%',
            left: '88%',
            width: 3,
            height: 3,
            background: 'var(--land-accent)',
            animationDelay: '2s',
          }}
        />
        <div
          className="dust-dot"
          style={{
            top: '35%',
            left: '92%',
            width: 5,
            height: 5,
            background: 'var(--land-gold)',
            animationDelay: '4s',
          }}
        />
        <div
          className="dust-dot"
          style={{
            top: '80%',
            left: '5%',
            width: 3,
            height: 3,
            background: 'var(--land-accent)',
            animationDelay: '1s',
          }}
        />

        <div className="relative mx-auto mb-16 max-w-2xl text-center">
          <p
            className="f-mono mb-3 text-xs uppercase tracking-[0.25em]"
            style={{ color: 'var(--land-gold)' }}
          >
            What Dust searches
          </p>
          <h2 className="f-display mb-4 text-3xl sm:text-4xl">
            Every listing lives in one of four areas.
          </h2>
          <p style={{ color: 'var(--land-muted)' }}>
            Tell Dust your course, year, and location, and it filters to the areas that fit — then
            explains why a specific listing is worth your time. Live listings today sit in
            Advancement, with Funding opening next.
          </p>
        </div>

        <div className="relative mx-auto max-w-3xl">
          <div
            className="absolute bottom-0 left-1/2 top-0 hidden w-px -translate-x-1/2 sm:block"
            style={{
              background:
                'repeating-linear-gradient(to bottom, var(--land-border) 0 6px, transparent 6px 14px)',
            }}
          />
          <div className="flex flex-col gap-10">
            {AREAS.map((area, i) => {
              const alignRight = i % 2 === 1
              const visible = visibleAreas[i]
              return (
                <div
                  key={area.name}
                  id={area.name.toLowerCase()}
                  ref={(el) => {
                    areaRefs.current[i] = el
                  }}
                  data-idx={i}
                  className={`relative sm:w-[46%] ${alignRight ? 'sm:ml-auto' : ''}`}
                >
                  <span
                    className="absolute top-6 hidden h-2.5 w-2.5 rotate-45 sm:block"
                    style={{
                      background: 'var(--land-accent)',
                      left: alignRight ? '-1.6rem' : 'auto',
                      right: alignRight ? 'auto' : '-1.6rem',
                    }}
                  />
                  <div
                    className="area-card rounded-2xl p-6"
                    style={{
                      background: 'var(--land-card)',
                      border: '1px solid var(--land-border)',
                      opacity: visible ? 1 : 0,
                      transform: visible
                        ? `translateY(0) rotate(${alignRight ? '0.6deg' : '-0.6deg'})`
                        : 'translateY(24px) rotate(0deg)',
                    }}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="f-display text-xl">{area.name}</h3>
                      <span className="f-mono text-[11px]" style={{ color: 'var(--land-muted)' }}>
                        {area.tag}
                      </span>
                    </div>
                    <p className="mb-4 text-sm" style={{ color: 'var(--land-muted)' }}>
                      {area.desc}
                    </p>
                    <ul className="mb-3 space-y-1.5">
                      {area.items.map((it) => (
                        <li key={it} className="flex items-center gap-2 text-sm">
                          <span
                            className="h-1 w-1 rounded-full"
                            style={{ background: 'var(--land-accent)' }}
                          />
                          {it}
                        </li>
                      ))}
                    </ul>
                    {area.note && (
                      <span
                        className="f-mono inline-block rounded-full px-2 py-1 text-[11px]"
                        style={{
                          background: 'var(--land-badge-bg)',
                          color: 'var(--land-badge-ink)',
                        }}
                      >
                        {area.note}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* stages */}
      <section
        ref={(el) => {
          sectionRefs.current.stages = el
        }}
        data-section="stages"
        className="px-6 py-24"
        style={{ borderTop: '1px solid var(--land-border)' }}
      >
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p
            className="f-mono mb-3 text-xs uppercase tracking-[0.25em]"
            style={{ color: 'var(--land-gold)' }}
          >
            How Dust decides
          </p>
          <h2 className="f-display text-3xl sm:text-4xl">
            Three questions, in this order, every time.
          </h2>
          <p className="mt-3">
            <Link to="/how-it-works" className="text-sm underline" style={{ color: 'var(--land-accent)' }}>
              Read the full matching walkthrough
            </Link>
          </p>
        </div>
        <div className="mx-auto flex max-w-2xl flex-col gap-10">
          {STAGES.map((s) => (
            <div key={s.n} className="flex gap-5">
              <span className="f-mono mt-1 text-sm" style={{ color: 'var(--land-accent)' }}>
                {s.n}
              </span>
              <div className="pl-5" style={{ borderLeft: '1px solid var(--land-border)' }}>
                <h3 className="f-display mb-2 text-xl">{s.label}</h3>
                <p className="text-sm" style={{ color: 'var(--land-muted)' }}>
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* dust preview */}
      <section
        ref={(el) => {
          sectionRefs.current.dust = el
        }}
        data-section="dust"
        className="px-6 py-24"
        style={{ borderTop: '1px solid var(--land-border)' }}
      >
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p
            className="f-mono mb-3 text-xs uppercase tracking-[0.25em]"
            style={{ color: 'var(--land-gold)' }}
          >
            Meet Dust
          </p>
          <h2 className="f-display mb-4 text-3xl sm:text-4xl">
            Don&apos;t search. Just describe your situation.
          </h2>
          <p style={{ color: 'var(--land-muted)' }}>
            Dust is Pathfinder&apos;s AI — available after you sign in. Tell it who you are and what
            you need; it reasons across all four areas instead of making you pick one.
          </p>
        </div>

        <div
          className="mx-auto max-w-xl rounded-2xl p-6"
          style={{ background: 'var(--land-card)', border: '1px solid var(--land-border)' }}
        >
          <div className="mb-4 flex items-center gap-2">
            <DustAvatar size={22} />
            <span
              className="f-mono text-xs uppercase tracking-widest"
              style={{ color: 'var(--land-muted)' }}
            >
              Dust · sample conversation
            </span>
          </div>
          <p className="mb-3 text-sm">
            <span style={{ color: 'var(--land-accent)' }}>You:</span> 3rd year BCom at Moi, want
            fieldwork not a desk job, based in Nairobi.
          </p>
          <p className="text-sm" style={{ color: 'var(--land-muted)' }}>
            <span style={{ color: 'var(--land-gold)' }}>Dust:</span> That points at the KCB finance
            attachment, Q4 intake — fieldwork-heavy, and the supervisor sign-off is already sorted
            before your first day. Want the deadline and how to apply?
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
              style={{ background: 'var(--land-accent)', color: 'var(--land-cta-ink)' }}
            >
              <Sparkles size={15} /> Sign up to use Dust
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center rounded-full border px-5 py-2.5 text-sm"
              style={{ borderColor: 'var(--land-border)', color: 'var(--land-ink)' }}
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer
        ref={(el) => {
          sectionRefs.current.footer = el
        }}
        data-section="footer"
        className="px-6 py-16"
        style={{ borderTop: '1px solid var(--land-border)' }}
      >
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-10 sm:grid-cols-5">
          <div className="col-span-2 sm:col-span-1">
            <div className="mb-3 flex items-center gap-2">
              <Compass size={16} style={{ color: 'var(--land-accent)' }} />
              <span className="f-display text-base">Pathfinder</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--land-muted)' }}>
              Jobs, funding, courses, and rooms worth being in — found for you, and explained, by
              Dust.
            </p>
          </div>
          <div>
            <p
              className="f-mono mb-3 text-xs uppercase tracking-widest"
              style={{ color: 'var(--land-accent)' }}
            >
              N — Find
            </p>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--land-muted)' }}>
              <li>
                <a href="#advancement">Advancement</a>
              </li>
              <li>
                <a href="#funding">Funding</a>
              </li>
              <li>
                <a href="#knowledge">Knowledge</a>
              </li>
              <li>
                <a href="#networking">Networking</a>
              </li>
            </ul>
          </div>
          <div>
            <p
              className="f-mono mb-3 text-xs uppercase tracking-widest"
              style={{ color: 'var(--land-accent)' }}
            >
              E — About
            </p>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--land-muted)' }}>
              <li>
                <Link to="/how-it-works">How matching works</Link>
              </li>
              <li>
                <Link to="/register">Get started</Link>
              </li>
            </ul>
          </div>
          <div>
            <p
              className="f-mono mb-3 text-xs uppercase tracking-widest"
              style={{ color: 'var(--land-accent)' }}
            >
              W — Dust
            </p>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--land-muted)' }}>
              <li>
                <Link to="/login">Sign in to chat</Link>
              </li>
              <li>
                <Link to="/how-it-works">How it decides</Link>
              </li>
            </ul>
          </div>
          <div>
            <p
              className="f-mono mb-3 text-xs uppercase tracking-widest"
              style={{ color: 'var(--land-accent)' }}
            >
              S — Account
            </p>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--land-muted)' }}>
              <li>
                <Link to="/login">Sign in</Link>
              </li>
              <li>
                <Link to="/register">Create account</Link>
              </li>
            </ul>
          </div>
        </div>
        <div
          className="mx-auto mt-12 flex max-w-5xl flex-wrap justify-between gap-3 border-t pt-6 text-xs"
          style={{ borderColor: 'var(--land-border)', color: 'var(--land-faint)' }}
        >
          <span>© 2026 Pathfinder</span>
          <span>Nairobi</span>
        </div>
      </footer>

      <Link
        to="/register"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-5 py-3.5 shadow-lg"
        style={{ background: 'var(--land-accent)', color: 'var(--land-cta-ink)' }}
      >
        <Sparkles size={17} />
        <span className="text-sm font-medium">Get started</span>
      </Link>
    </div>
  )
}
