import { CompassMark } from '../components/CompassMark'

export default function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-page px-4">
      <CompassMark size={64} />
      <div className="mt-5 text-2xl font-medium tracking-tight text-ink">Pathfinder</div>
      <p className="mt-2 text-sm text-muted">Opportunities that fit your trail</p>
      <div className="mt-6 flex gap-1.5">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal [animation-delay:300ms]" />
      </div>
      <p className="mt-4 text-sm text-label">Checking your route…</p>
    </div>
  )
}
