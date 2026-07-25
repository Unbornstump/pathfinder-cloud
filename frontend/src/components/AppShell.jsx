import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Footprints, MapPin, User } from 'lucide-react'
import { CompassMark } from './CompassMark'
import DustAvatar from './DustAvatar'
import { useAuth } from '../context/AuthContext'
import { useDust } from '../context/DustContext'

const NAV = [
  { to: '/matches', label: 'Matches', icon: MapPin },
  { to: '/moves', label: 'Moves', icon: Footprints },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile', label: 'Profile', icon: User },
]

/**
 * Joined L-shell: top bar + left rail as one continuous surface.
 * Same background, no seam — compass sits at the join corner.
 */
export default function AppShell() {
  const { profile, notifications, logout } = useAuth()
  const { open, openDust } = useDust()
  const location = useLocation()
  const navigate = useNavigate()
  const [confirmSignOut, setConfirmSignOut] = useState(false)

  const unread = (notifications || []).filter((n) => !n.is_read).length
  const initial = (profile?.name || profile?.username || '?').charAt(0).toUpperCase()

  const pageTitle = location.pathname.startsWith('/notifications')
    ? 'Notifications'
    : location.pathname.startsWith('/profile')
      ? 'Your profile'
      : location.pathname.startsWith('/moves')
        ? 'Your moves'
        : 'Your matches'

  return (
    <div className="relative min-h-screen bg-page">
      {/* Single continuous L: shared shell tone, no seam */}
      <div className="pointer-events-none absolute inset-0 z-20">
        {/* Top arm */}
        <div className="pointer-events-auto absolute left-16 right-3 top-3 flex h-14 items-center justify-between rounded-full bg-shell pl-5 pr-3">
          <h1 className="truncate text-lg text-ink">{pageTitle}</h1>
          <div className="flex shrink-0 items-center gap-2">
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

        {/* Left rail */}
        <div className="pointer-events-auto absolute left-3 top-3 flex h-[75%] w-16 flex-col items-center rounded-b-[2rem] bg-shell pb-4">
          <div className="absolute left-1/2 top-2 z-30 -translate-x-1/2">
            <NavLink to="/matches" aria-label="Home">
              <CompassMark size={40} variant="shell" />
            </NavLink>
          </div>

          <div className="trail-line absolute bottom-6 left-1/2 top-16 -translate-x-1/2" />

          <nav className="relative z-10 mt-16 flex flex-1 flex-col items-center justify-evenly py-2">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                title={label}
                aria-label={label}
                className={({ isActive }) =>
                  `waypoint-marker relative flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                    isActive
                      ? 'border-teal bg-teal text-white'
                      : 'border-border-strong bg-transparent text-muted hover:text-ink'
                  }`
                }
              >
                <Icon size={18} />
                {to === '/notifications' && unread > 0 && (
                  <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-teal" />
                )}
              </NavLink>
            ))}

            <button
              type="button"
              title="Dust"
              aria-label="Ask Dust"
              onClick={openDust}
              className={`waypoint-marker relative mt-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed ${
                open ? 'border-trail-gold' : 'border-border-strong'
              }`}
            >
              <DustAvatar size={22} />
            </button>
          </nav>
        </div>
      </div>

      <div
        className="absolute bottom-0 right-0 top-0 overflow-y-auto"
        style={{ left: '4.5rem', paddingTop: '4.25rem' }}
      >
        <Outlet />
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
            <h2 className="mb-2 text-lg text-ink">Sign out of Pathfinder?</h2>
            <p className="mb-6 text-sm text-muted">
              You'll need to sign in again to see your matches.
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
