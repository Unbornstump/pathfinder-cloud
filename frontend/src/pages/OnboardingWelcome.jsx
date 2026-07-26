import { useNavigate } from 'react-router-dom'
import { ArrowRight, Compass } from 'lucide-react'
import { useDust } from '../context/DustContext'
import DustAvatar from '../components/DustAvatar'

export default function OnboardingWelcome() {
  const navigate = useNavigate()
  const { openDust } = useDust()

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4 py-10">
      <div className="w-full max-w-md rounded-[12px] border border-border bg-card p-8 text-center">
        <div className="mb-6 flex justify-center gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`h-1 w-8 rounded-full ${i === 0 ? 'bg-teal' : 'bg-border'}`}
            />
          ))}
        </div>
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-teal/15 text-teal">
          <Compass size={28} />
        </div>
        <h1 className="font-display mb-3 text-2xl text-ink">Alo alo</h1>
        <p className="mb-8 text-sm leading-relaxed text-muted">
          Welcome to Pathfinder. A few short steps will let us know what to watch for — or describe
          yourself to Dust in plain language and skip the form.
        </p>
        <button
          type="button"
          onClick={() => navigate('/onboarding/steps')}
          className="inline-flex w-full items-center justify-center gap-2 rounded-[12px] bg-teal px-4 py-2.5 text-white hover:bg-teal-dark"
        >
          Let&apos;s start
          <ArrowRight size={18} />
        </button>
        <button
          type="button"
          onClick={() => openDust()}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 text-sm text-teal hover:text-teal-dark"
        >
          <DustAvatar size={18} />
          Ask Dust instead
        </button>
      </div>
    </div>
  )
}
