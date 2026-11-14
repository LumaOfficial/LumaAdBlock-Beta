import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ApiError, api, clearToken, getToken, setToken } from './api'
import { US_STATES, stateName } from './usStates'

/**
 * Accounts live on the Luma account service (encrypted at rest), so one
 * sign-in works on every device. This device keeps only a sign-in token.
 */

// Earlier builds kept accounts in this browser's storage. Remove that data.
const LEGACY_KEYS = ['luma.accounts.v1', 'luma.session.v1', 'luma.device.last-email.v1']
function clearLegacyData() {
  try {
    for (const key of LEGACY_KEYS) {
      window.localStorage.removeItem(key)
      window.sessionStorage.removeItem(key)
    }
  } catch {
    /* ignore */
  }
}

export function phoneDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

export function ageFromDob(dob) {
  if (!dob) return null
  const birth = new Date(`${dob}T00:00:00`)
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const month = now.getMonth() - birth.getMonth()
  if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) age -= 1
  return age
}

/** Validates a sign-up form and returns normalised values plus per-field errors. */
export function validateSignup(values) {
  const errors = {}
  const name = String(values.name || '').trim().replace(/\s+/g, ' ')
  const email = String(values.email || '').trim().toLowerCase()
  const password = String(values.password || '')
  const phone = phoneDigits(values.phone)
  const state = String(values.state || '')
  const dob = String(values.dob || '')

  if (name.length < 2) errors.name = 'Enter your full name'

  const age = ageFromDob(dob)
  if (!dob) errors.dob = 'Enter your date of birth'
  else if (age === null || age > 120) errors.dob = 'Enter a valid date of birth'
  else if (age < 13) errors.dob = 'You must be at least 13 to create an account'

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address'
  if (password.length < 8) errors.password = 'Use at least 8 characters'
  if (phone.length !== 10) errors.phone = 'Enter a 10-digit phone number'
  if (!US_STATES.some((item) => item.code === state)) errors.state = 'Select your state'
  if (!values.acceptedTerms) errors.terms = 'Accept the Terms and Privacy Policy to continue'

  return { errors, clean: { name, email, password, phone, state, dob } }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // 'loading' while a remembered device checks its token with the service.
  const [status, setStatus] = useState(() => (getToken() ? 'loading' : 'ready'))
  const [connectionError, setConnectionError] = useState('')

  useEffect(() => {
    clearLegacyData()
    if (!getToken()) return undefined
    let alive = true
    api('/api/me')
      .then((data) => alive && setUser(data.user))
      .catch((error) => {
        if (!alive) return
        if (error instanceof ApiError && error.status === 401) clearToken()
        else setConnectionError(error.message)
      })
      .finally(() => alive && setStatus('ready'))
    return () => {
      alive = false
    }
  }, [])

  const signUp = useCallback(async (values, { remember = true } = {}) => {
    const data = await api('/api/signup', {
      method: 'POST',
      auth: false,
      body: { ...values, acceptedTerms: true, remember },
    })
    setToken(data.token, remember)
    setConnectionError('')
    setUser(data.user)
    return data.user
  }, [])

  const signIn = useCallback(async ({ email, password }, { remember = true } = {}) => {
    const data = await api('/api/signin', {
      method: 'POST',
      auth: false,
      body: { email, password, remember },
    })
    setToken(data.token, remember)
    setConnectionError('')
    setUser(data.user)
    return data.user
  }, [])

  const signOut = useCallback(() => {
    api('/api/signout', { method: 'POST' }).catch(() => {})
    clearToken()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      status,
      connectionError,
      stateLabel: user ? stateName(user.state) : '',
      signUp,
      signIn,
      signOut,
    }),
    [user, status, connectionError, signUp, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
