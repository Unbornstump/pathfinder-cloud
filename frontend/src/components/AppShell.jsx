import { useState } from 'react'
import { Bell, Footprints, MapPin, User } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { CompassMark } from './CompassMark'
import DustAvatar from './DustAvatar'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '../context/AuthContext'

const DISCOVER = [
  { to: '/matches', label: 'Matches', icon: MapPin },
  { to: '/moves', label: 'Moves', icon: Footprints },
]

const YOU = [
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile', label: 'Profile', icon: User },
]

function RailLink({ to, label, icon: Icon, badge }) {
  return (
    <NavLink
      to={to}
      title={label}
      aria-label={label}
      className={({ isActive }) =>
        `group flex w-full items-center justify-center gap-3 rounded-xl px-2 py-2.5 text-sm transition md:justify-start md:px-3 ${
          isActive
            ? 'bg-teal text-white'
            : 'text-muted hover:bg-page hover:text-ink'
        }`
      }
    >
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
        <Icon size={18} />
        {badge ? (
          <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-trail-gold ring-2 ring-shell" />
        ) : null}
      </span>
      <span className="hidden font-medium md:inline">{label}</span>
    </NavLink>
  )
}

/**
 * Destination menu — Discover / You / Dust.
 * No dotted trail: these are rooms, not steps.
 */
export default function AppShell() {
  const { profile, notifications, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [confirmSignOut, setConfirmSignOut] = useState(false)

  const unread = (notifications || []).filter((n) => !n.is_read).length
  const initial = (profile?.name || profile?.username || '?').charAt(0).toUpperCase()

  const pageTitle = location.pathname.startsWith('/notifications')
    ? 'Notifications'
    : location.pathname.startsWith('/profile')
      ? 'Your trail'
      : location.pathname.startsWith('/moves')
        ? 'Your moves'
        : location.pathname.startsWith('/dust')
          ? 'Dust'
          : 'Your matches'

  return (
    <div className="app-shell relative min-h-screen bg-page">
      <div className="pointer-events-none absolute inset-0 z-20">
        {/* Top arm */}
        <div className="pointer-events-auto absolute left-[4.75rem] right-3 top-3 flex h-14 items-center justify-between rounded-full bg-shell pl-5 pr-3 md:left-[11.5rem]">
          <h1 className="font-display truncate text-lg text-ink">{pageTitle}</h1>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-teal text-sm font-medium text-white"
              title={profile?.username}
            >
              {initial}
            </div>
            <button
              type="button"
              onClick={() => setConfirmSignOut(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-3 py-1.5 text-sm text-ink hover:bg-page"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Left rail — grouped destinations */}
        <div className="pointer-events-auto absolute bottom-3 left-3 top-3 flex w-14 flex-col rounded-[1.5rem] bg-shell px-1.5 py-3 md:w-40 md:px-2">
          <div className="mb-4 flex justify-center pt-1">
            <NavLink to="/matches" aria-label="Pathfinder home">
              <CompassMark size={36} variant="shell" />
            </NavLink>
          </div>

          <p className="mb-1 hidden px-3 font-mono text-[10px] uppercase tracking-widest text-label md:block">
            Discover
          </p>
          <nav className="flex flex-col gap-0.5">
            {DISCOVER.map((item) => (
              <RailLink key={item.to} {...item} />
            ))}
          </nav>

          <div className="mx-2 my-3 border-t border-dashed border-border-strong md:mx-3" />

          <p className="mb-1 hidden px-3 font-mono text-[10px] uppercase tracking-widest text-label md:block">
            You
          </p>
          <nav className="flex flex-col gap-0.5">
            {YOU.map((item) => (
              <RailLink
                key={item.to}
                {...item}
                badge={item.to === '/notifications' && unread > 0}
              />
            ))}
          </nav>

          <div className="mx-2 my-3 border-t border-dashed border-border-strong md:mx-3" />

          <NavLink
            to="/dust"
            data-dust-trigger
            title="Dust"
            aria-label="Dust"
            className={({ isActive }) =>
              `dust-always-on mt-auto flex w-full items-center justify-center gap-3 rounded-xl px-2 py-2.5 text-sm transition md:justify-start md:px-3 ${
                isActive
                  ? 'bg-dust-panel text-dust-bone'
                  : 'text-ink hover:bg-page'
              }`
            }
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dust-panel shadow-[0_0_0_4px_rgba(217,167,86,0.18)]">
              <DustAvatar size={16} />
            </span>
            <span className="hidden font-medium md:inline">Dust</span>
          </NavLink>
        </div>
      </div>

      <div
        className="absolute bottom-0 right-0 top-0 overflow-y-auto"
        style={{ paddingTop: '4.25rem' }}
        // left offset: narrow rail on mobile, labeled rail on md+
      >
        <div className="pl-[4.75rem] md:pl-[11.5rem]">
          <Outlet />
        </div>
      </div>

      {confirmSignOut && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setConfirmSignOut(false)}
        >
          <div
            className="w-full max-w-sm rounded-[12px] border border-border bg-card p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h2 className="font-display mb-2 text-lg text-ink">Sign out of Pathfinder?</h2>
            <p className="mb-6 text-sm text-muted">
              You&apos;ll need to sign in again to see your matches.
            </p>
            <div className="flex items-center justify-end gap-6">
              <button
                type="button"
                onClick={() => setConfirmSignOut(false)}
                className="text-sm font-medium text-teal hover:text-teal-dark"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmSignOut(false)
                  await logout()
                  navigate('/', { replace: true })
                }}
                className="rounded-[8px] bg-teal px-4 py-2 text-sm text-white hover:bg-teal-dark"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
