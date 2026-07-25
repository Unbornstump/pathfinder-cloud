/** Compass mark — blue disc + ring, for dark shell/landing */
export function CompassMark({ size = 56, className = '', variant = 'hero' }) {
  const s = size
  if (variant === 'shell') {
    return (
      <div
        className={`flex items-center justify-center rounded-[10px] bg-teal text-white ${className}`}
        style={{ width: s, height: s }}
        aria-hidden="true"
      >
        <svg width={s * 0.55} height={s * 0.55} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 5 L14.5 12 L12 19 L9.5 12 Z" fill="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="#0c0c0d" />
        </svg>
      </div>
    )
  }

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="30" stroke="#60a5fa" strokeWidth="2" fill="none" opacity="0.5" />
      <circle cx="32" cy="32" r="24" fill="#3b82f6" />
      <path d="M32 14 L38 32 L32 50 L26 32 Z" fill="#ffffff" />
      <circle cx="32" cy="32" r="3.5" fill="#1e3a5f" />
    </svg>
  )
}
