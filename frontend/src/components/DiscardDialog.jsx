export default function DiscardDialog({ onStay, onDiscard }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
      onClick={onStay}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onStay()
      }}
    >
      <div
        className="w-full max-w-sm rounded-[12px] border border-border bg-card p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="discard-title"
      >
        <h2 id="discard-title" className="mb-2 text-lg text-ink">
          Discard your progress?
        </h2>
        <p className="mb-6 text-sm text-muted">
          You have unsaved answers in these steps. Leaving now will throw them away.
        </p>
        <div className="flex items-center justify-end gap-6">
          <button type="button" onClick={onStay} className="text-sm font-medium text-teal hover:text-teal-dark">
            Stay
          </button>
          <button type="button" onClick={onDiscard} className="text-sm text-muted hover:text-ink">
            Discard
          </button>
        </div>
      </div>
    </div>
  )
}
