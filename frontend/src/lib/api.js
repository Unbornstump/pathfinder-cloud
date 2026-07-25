const API_BASE = import.meta.env.VITE_API_BASE || '/api'

let accessToken = null
let refreshPromise = null

export function setAccessToken(token) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

function errorMessage(data, status) {
  if (!data) return `Request failed (${status})`
  if (typeof data.detail === 'string') return data.detail
  if (Array.isArray(data.detail)) return data.detail.map(String).join(' ')
  if (typeof data === 'object') {
    const parts = Object.entries(data).flatMap(([key, val]) => {
      const msgs = Array.isArray(val) ? val : [val]
      return msgs.map((m) => (key === 'detail' ? String(m) : `${key}: ${m}`))
    })
    if (parts.length) return parts.join(' ')
  }
  return data.message || `Request failed (${status})`
}

export async function api(path, { method = 'GET', body, token, headers = {}, _retry = true } = {}) {
  const auth = token ?? accessToken
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  let data = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { detail: text }
    }
  }

  if (res.status === 401 && _retry && !path.includes('/token/')) {
    try {
      await refreshAccessToken()
      return api(path, { method, body, headers, _retry: false })
    } catch {
      /* fall through */
    }
  }

  if (!res.ok) {
    const err = new Error(errorMessage(data, res.status))
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const data = await api('/token/refresh/', {
        method: 'POST',
        body: {},
        _retry: false,
      })
      setAccessToken(data.access)
      return data.access
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}
