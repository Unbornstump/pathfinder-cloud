import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

/** Inline SVG icons — no external icon font. */
export function CompassIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-2 5-5 2 2-5z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function FootprintsIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 4c2 3 2 5 0 8M8 2c2 4 2 8 0 12M20 12c-2 3-2 5 0 8M16 10c-2 4-2 8 0 12" />
    </svg>
  )
}

export function DayTrailIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </svg>
  )
}

/** Three scattered amber motes — replaces the hamburger on mobile. */
export function DustMoteIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="7" cy="8" r="2.4" fill="#d99a5c" />
      <circle cx="15.5" cy="6.5" r="1.6" fill="#d99a5c" />
      <circle cx="12" cy="15.5" r="2.1" fill="#d99a5c" />
    </svg>
  )
}

const BTN =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--land-accent)]'

/**
 * Landing header actions — theme, sign in, get started.
 */
export default function PathfinderNavActions({ className = '', stacked = false }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div
      className={`${stacked ? 'flex flex-col gap-2' : 'flex items-center gap-2 sm:gap-3.5'} ${className}`}
    >
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to day trail' : 'Switch to night trail'}
        title={isDark ? 'Day trail' : 'Night trail'}
        className={`${BTN} ${stacked ? 'w-full justify-start border px-4' : 'h-9 w-9 rounded-full border'}`}
        style={{ borderColor: 'var(--land-border)', color: 'var(--land-ink)' }}
      >
        <DayTrailIcon size={18} />
        {stacked ? <span>{isDark ? 'Day trail' : 'Night trail'}</span> : null}
      </button>

      <Link
        to="/login"
        className={`${BTN} border ${stacked ? 'w-full px-4' : 'sm:px-4'}`}
        style={{ borderColor: 'var(--land-border)', color: 'var(--land-ink)' }}
      >
        <FootprintsIcon size={16} />
        Sign in
      </Link>

      <Link
        to="/register"
        className={`${BTN} font-medium ${stacked ? 'w-full px-4' : 'sm:px-4'}`}
        style={{ background: 'var(--land-accent)', color: 'var(--land-cta-ink)' }}
      >
        <CompassIcon size={16} />
        Get started
      </Link>
    </div>
  )
}
