/** Soft dust-mote mark — amber, trail blue, moss, clay. */
export default function DustAvatar({ size = 28, className = '', animated = true }) {
  const s = size
  const cls = animated ? 'dust-particle' : undefined
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <circle cx="12" cy="5.5" r="2" fill="#D9A756" className={cls} style={{ animationDelay: '0s' }} />
      <circle cx="5.5" cy="13" r="1.6" fill="#3654A6" className={cls} style={{ animationDelay: '0.6s' }} />
      <circle cx="18" cy="12.5" r="1.3" fill="#6E8259" className={cls} style={{ animationDelay: '1.2s' }} />
      <circle cx="10.5" cy="18.5" r="1.8" fill="#B5624A" className={cls} style={{ animationDelay: '1.8s' }} />
      <circle cx="16" cy="18" r="1" fill="#3654A6" className={cls} style={{ animationDelay: '0.3s' }} />
    </svg>
  )
}
