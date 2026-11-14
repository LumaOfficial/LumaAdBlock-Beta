import { API_BASE, api } from './api'

/**
 * Signing in with a provider or an emailed code. Kept out of auth.jsx so that
 * module exports only its component and stays a Fast Refresh boundary.
 */

export const SSO_PROVIDERS = [
  { id: 'google', label: 'Google' },
  { id: 'microsoft', label: 'Microsoft' },
  { id: 'github', label: 'GitHub' },
  { id: 'apple', label: 'Apple' },
]

export function providerLabel(id) {
  return SSO_PROVIDERS.find((item) => item.id === id)?.label || ''
}

/** Where the browser goes to start a provider sign-in. */
export function providerStartUrl(id, remember = true) {
  return `${API_BASE}/api/oauth/${id}/start?remember=${remember ? '1' : '0'}`
}

/** Which providers the account service has credentials for. */
export function fetchAuthOptions() {
  return api('/api/auth/providers', { auth: false })
}

/** Emails a 6-digit sign-in code to the address. */
export function requestEmailCode(email) {
  return api('/api/email/start', { method: 'POST', auth: false, body: { email } })
}

/** Reads the reply a provider sign-in left on the URL, then tidies the address. */
export function takeSignInReply() {
  if (typeof window === 'undefined') return { ticket: '', error: '' }
  const params = new URLSearchParams(window.location.search)
  const ticket = params.get('luma_ticket') || ''
  const error = params.get('auth_error') || ''
  if (ticket || error) {
    params.delete('luma_ticket')
    params.delete('auth_error')
    const rest = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (rest ? '?' + rest : '') + window.location.hash)
  }
  return { ticket, error }
}
