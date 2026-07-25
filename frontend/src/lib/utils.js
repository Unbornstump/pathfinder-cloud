/** Eight life-opportunity categories from the landscape taxonomy. */
export const OPPORTUNITY_TYPES = [
  {
    id: 'academic',
    label: 'academic & educational',
    short: 'academic',
    colorClass: 'bg-academic text-white border-academic',
    badgeClass: 'bg-academic',
    wedge: false,
  },
  {
    id: 'employment',
    label: 'employment & career',
    short: 'employment',
    colorClass: 'bg-employment text-white border-employment',
    badgeClass: 'bg-employment',
    wedge: false,
  },
  {
    id: 'research',
    label: 'research & innovation',
    short: 'research',
    colorClass: 'bg-research text-white border-research',
    badgeClass: 'bg-research',
    wedge: true,
  },
  {
    id: 'professional_dev',
    label: 'professional development',
    short: 'professional dev',
    colorClass: 'bg-professional text-white border-professional',
    badgeClass: 'bg-professional',
    wedge: false,
  },
  {
    id: 'experiential',
    label: 'experiential learning',
    short: 'experiential',
    colorClass: 'bg-experiential text-white border-experiential',
    badgeClass: 'bg-experiential',
    wedge: false,
  },
  {
    id: 'social_impact',
    label: 'social impact',
    short: 'social impact',
    colorClass: 'bg-social text-white border-social',
    badgeClass: 'bg-social',
    wedge: false,
  },
  {
    id: 'entrepreneurship',
    label: 'entrepreneurship',
    short: 'entrepreneurship',
    colorClass: 'bg-entrepreneur text-white border-entrepreneur',
    badgeClass: 'bg-entrepreneur',
    wedge: false,
  },
  {
    id: 'cultural_exchange',
    label: 'cultural & creative exchange',
    short: 'cultural exchange',
    colorClass: 'bg-cultural text-white border-cultural',
    badgeClass: 'bg-cultural',
    wedge: false,
  },
]

export const INTENT_BUCKETS = [
  { id: 'advancement', label: 'advancement' },
  { id: 'funding', label: 'funding' },
  { id: 'knowledge', label: 'knowledge' },
  { id: 'networking', label: 'networking' },
]

/** Suggested interest tags for the funding/fellowships wedge. */
export const WEDGE_TAG_HINTS = [
  'fellowship',
  'grant',
  'research',
  'scholarship',
  'funding',
  'innovation',
]

export function typeMeta(type) {
  return OPPORTUNITY_TYPES.find((t) => t.id === type) || OPPORTUNITY_TYPES[0]
}

export function daysUntil(deadline) {
  if (!deadline) return null
  const end = new Date(deadline)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24))
}

export function relativeTime(iso) {
  const then = new Date(iso)
  const now = new Date()
  const seconds = Math.floor((now - then) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return then.toLocaleDateString()
}
