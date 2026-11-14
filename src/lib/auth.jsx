import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { US_STATES, stateName } from './usStates'

/**
 * Device accounts.
 *
 * Luma has no server: an account is created and kept in this browser's
 * storage, the password is stored as a salted PBKDF2 hash, and the signed-in
 * session is remembered on the device until the person signs out.
 */
const ACCOUNTS_KEY = 'luma.accounts.v1'
const SESSION_KEY = 'luma.session.v1'
const LAST_EMAIL_KEY = 'luma.device.last-email.v1'
const ITERATIONS = 120000

function readJSON(storage, key, fallback) {
  try {
    const raw = storage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage can be unavailable in private windows */
  }
}

function readAccounts() {
  if (typeof window === 'undefined') return []
  const accounts = readJSON(window.localStorage, ACCOUNTS_KEY, [])
  return Array.isArray(accounts) ? accounts : []
}

function saveAccounts(accounts) {
  writeJSON(window.localStorage, ACCOUNTS_KEY, accounts)
}

function randomSalt() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password, salt) {
  if (!crypto?.subtle) throw new Error('Accounts need a secure browser context')
  const encoder = new TextEncoder()
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    256,
  )
  return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function publicAccount(account) {
  if (!account) return null
  const { id, name, email, phone, state, dob, createdAt } = account
  return { id, name, email, phone, state, dob, createdAt }
}

function readSession() {
  if (typeof window === 'undefined') return null
  return (
    readJSON(window.localStorage, SESSION_KEY, null) ||
    readJSON(window.sessionStorage, SESSION_KEY, null)
  )
}

function accountForSession() {
  const session = readSession()
  if (!session?.accountId) return null
  return readAccounts().find((account) => account.id === session.accountId) || null
}

export function phoneDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

export function formatPhone(digits) {
  const value = phoneDigits(digits)
  if (value.length !== 10) return value
  return `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`
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

  return {
    errors,
    clean: { name, email, password, phone, state, dob },
  }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => publicAccount(accountForSession()))
  const [lastEmail, setLastEmail] = useState(() => {
    if (typeof window === 'undefined') return ''
    return readJSON(window.localStorage, LAST_EMAIL_KEY, '') || ''
  })

  const startSession = useCallback((account, remember) => {
    const target = remember ? window.localStorage : window.sessionStorage
    const other = remember ? window.sessionStorage : window.localStorage
    try {
      other.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
    writeJSON(target, SESSION_KEY, {
      accountId: account.id,
      since: new Date().toISOString(),
      remember: Boolean(remember),
    })
    writeJSON(window.localStorage, LAST_EMAIL_KEY, account.email)
    setLastEmail(account.email)
    setUser(publicAccount(account))
  }, [])

  const signUp = useCallback(
    async (values, { remember = true } = {}) => {
      const accounts = readAccounts()
      if (accounts.some((account) => account.email === values.email)) {
        throw new Error('An account with that email already exists on this device')
      }
      const salt = randomSalt()
      const hash = await hashPassword(values.password, salt)
      const account = {
        id: crypto.randomUUID ? crypto.randomUUID() : `account-${Date.now()}`,
        name: values.name,
        email: values.email,
        phone: values.phone,
        state: values.state,
        dob: values.dob,
        createdAt: new Date().toISOString(),
        password: { salt, hash, iterations: ITERATIONS },
      }
      saveAccounts([...accounts, account])
      startSession(account, remember)
      return publicAccount(account)
    },
    [startSession],
  )

  const signIn = useCallback(
    async ({ email, password }, { remember = true } = {}) => {
      const normalized = String(email || '').trim().toLowerCase()
      const account = readAccounts().find((item) => item.email === normalized)
      if (!account) throw new Error('No account found for that email on this device')
      const hash = await hashPassword(String(password || ''), account.password.salt)
      if (hash !== account.password.hash) throw new Error('That password does not match')
      startSession(account, remember)
      return publicAccount(account)
    },
    [startSession],
  )

  const signOut = useCallback(() => {
    try {
      window.localStorage.removeItem(SESSION_KEY)
      window.sessionStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      lastEmail,
      stateLabel: user ? stateName(user.state) : '',
      signUp,
      signIn,
      signOut,
    }),
    [user, lastEmail, signUp, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
