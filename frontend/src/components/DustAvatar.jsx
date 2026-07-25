/** Soft drifting dust-particle avatar used by Ask Dust pill and panel header. */
export default function DustAvatar({ size = 28, className = '' }) {
  const s = size
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
    >
      <circle cx="8" cy="12" r="2.2" fill="#BA7517" className="dust-particle" style={{ animationDelay: '0s' }} />
      <circle cx="16" cy="8" r="1.6" fill="#0F6E56" className="dust-particle" style={{ animationDelay: '0.6s' }} />
      <circle cx="22" cy="14" r="2" fill="#BA7517" className="dust-particle" style={{ animationDelay: '1.2s' }} />
      <circle cx="12" cy="20" r="1.4" fill="#CFCCC1" className="dust-particle" style={{ animationDelay: '1.8s' }} />
      <circle cx="20" cy="22" r="1.8" fill="#0F6E56" className="dust-particle" style={{ animationDelay: '0.3s' }} />
      <circle cx="26" cy="10" r="1.2" fill="#BA7517" className="dust-particle" style={{ animationDelay: '2.1s' }} />
    </svg>
  )
}
