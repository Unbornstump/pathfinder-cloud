/** Humanize stored locations — never show raw lat/lng to the user. */
const PLACE_BANDS = [
  { name: 'Nairobi', lat: [-1.45, -1.15], lng: [36.65, 37.05] },
  { name: 'Mombasa', lat: [-4.15, -3.9], lng: [39.55, 39.75] },
  { name: 'Kisumu', lat: [-0.15, 0.05], lng: [34.7, 34.85] },
  { name: 'Nakuru', lat: [-0.35, -0.2], lng: [36.0, 36.15] },
  { name: 'Eldoret', lat: [0.45, 0.6], lng: [35.2, 35.35] },
  { name: 'Meru', lat: [0.0, 0.15], lng: [37.6, 37.75] },
]

const COORD_RE = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/

export function parseCoords(raw) {
  if (!raw || typeof raw !== 'string') return null
  const m = raw.trim().match(COORD_RE)
  if (!m) return null
  return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
}

export function placeNameFromCoords(lat, lng) {
  for (const p of PLACE_BANDS) {
    if (lat >= p.lat[0] && lat <= p.lat[1] && lng >= p.lng[0] && lng <= p.lng[1]) {
      return p.name
    }
  }
  if (lat >= -5 && lat <= 5 && lng >= 33 && lng <= 42) return 'Kenya'
  return 'Your area'
}

/** Display label for profile/opportunity location fields. */
export function formatLocation(raw, fallback = '') {
  if (!raw || !String(raw).trim()) return fallback
  const coords = parseCoords(raw)
  if (!coords) return String(raw).trim()
  return placeNameFromCoords(coords.lat, coords.lng)
}

export function signalWord(score) {
  if (score <= 1) return 'Low'
  if (score <= 3) return 'Medium'
  return 'High'
}

export function profileSignalScore(profile) {
  let n = 0
  if (profile?.email) n += 1
  if (profile?.location) n += 1
  if (profile?.education_level) n += 1
  if (profile?.interest_tags?.length) n += 1
  if (profile?.desired_types?.length) n += 1
  return n
}
