/** Equal-width stat tiles — gap only, no dividing borders. */
export default function StatTiles({ tiles }) {
  return (
    <div className="mb-8 grid grid-cols-3 gap-4 sm:gap-6">
      {tiles.map((t) => (
        <div key={t.label} className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-wider text-label sm:text-[11px]">
            {t.label}
          </p>
          <p className="font-display mt-1 truncate text-2xl font-semibold text-ink sm:text-3xl">
            {t.value}
          </p>
        </div>
      ))}
    </div>
  )
}
