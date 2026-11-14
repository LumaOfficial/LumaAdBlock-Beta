/**
 * Client for the Luma account service.
 *
 * Every device talks to the same service, so an account created anywhere signs
 * in everywhere. Requests carry a bearer token; the token is the only thing
 * kept on the device (remembered across restarts unless the person opts out).
 */
export const API_BASE = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

const TOKEN_KEY = 'luma.token.v2'

export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message)
    this.status = status
    this.errors = errors || {}
  }
}

export function getToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY) || window.sessionStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function setToken(token, remember) {
  clearToken()
  try {
    ;(remember ? window.localStorage : window.sessionStorage).setItem(TOKEN_KEY, token)
  } catch {
    /* storage can be unavailable in private windows */
  }
}

export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY)
    window.sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = auth ? getToken() : ''
  if (token) headers.Authorization = 'Bearer ' + token

  let response
  try {
    response = await fetch(API_BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Luma could not reach its servers. Check your connection and try again.', 0)
  }

  let data = null
  try {
    data = await response.json()
  } catch {
    /* empty body */
  }
  if (!response.ok) {
    throw new ApiError(data?.error || 'Something went wrong. Try again.', response.status, data?.errors)
  }
  return data
}
