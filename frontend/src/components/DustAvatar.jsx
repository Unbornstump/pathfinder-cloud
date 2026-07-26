/** Soft dust-mote mark — theme tokens keep contrast on the badge in light and dark. */
export default function DustAvatar({
  size = 28,
  className = '',
  animated = true,
  thinking = false,
}) {
  const s = size
  const cls = !animated
    ? undefined
    : thinking
      ? 'dust-particle dust-particle-thinking'
      : 'dust-particle'
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      className={`dust-avatar ${thinking ? 'dust-avatar-thinking' : ''} ${className}`.trim()}
      aria-hidden="true"
      fill="none"
    >
      <circle
        cx="12"
        cy="5.5"
        r="2"
        fill="var(--pf-dust-mote-gold)"
        className={cls}
        style={{ animationDelay: '0s' }}
      />
      <circle
        cx="5.5"
        cy="13"
        r="1.6"
        fill="var(--pf-dust-mote-trail)"
        className={cls}
        style={{ animationDelay: '0.7s' }}
      />
      <circle
        cx="18"
        cy="12.5"
        r="1.3"
        fill="var(--pf-dust-mote-moss)"
        className={cls}
        style={{ animationDelay: '1.4s' }}
      />
      <circle
        cx="10.5"
        cy="18.5"
        r="1.8"
        fill="var(--pf-dust-mote-clay)"
        className={cls}
        style={{ animationDelay: '2.1s' }}
      />
      <circle
        cx="16"
        cy="18"
        r="1"
        fill="var(--pf-dust-mote-trail)"
        className={cls}
        style={{ animationDelay: '0.35s' }}
      />
      <circle
        cx="14.5"
        cy="8.5"
        r="0.7"
        fill="var(--pf-dust-mote-gold)"
        className={cls}
        style={{ animationDelay: '1.8s' }}
      />
    </svg>
  )
}
