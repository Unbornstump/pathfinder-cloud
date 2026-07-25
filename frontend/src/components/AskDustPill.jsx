import DustAvatar from './DustAvatar'

export default function AskDustPill({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm text-ink hover:border-trail"
      aria-label="Ask Dust"
    >
      <DustAvatar size={22} />
      Ask Dust
    </button>
  )
}
