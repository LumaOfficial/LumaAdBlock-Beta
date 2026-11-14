import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, api, clearToken, getToken, setToken } from './api'
import { stateName } from './usStates'
import { AuthContext } from './authContext'
import { takeSignInReply } from './sso'

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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // 'loading' while a remembered device checks its token with the service.
  const [status, setStatus] = useState(() => (getToken() ? 'loading' : 'ready'))
  const [connectionError, setConnectionError] = useState('')

  useEffect(() => {
    clearLegacyData()
    // A provider sign-in comes back to this page with a one-time ticket.
    const reply = takeSignInReply()
    if (reply.error) setConnectionError(reply.error)
    if (reply.ticket) {
      let ready = true
      setStatus('loading')
      api('/api/session/ticket', { method: 'POST', auth: false, body: { ticket: reply.ticket } })
        .then((data) => {
          if (!ready) return
          setToken(data.token, true)
          setUser(data.user)
        })
        .catch((error) => {
          if (ready) setConnectionError(error.message)
        })
        .finally(() => {
          if (ready) setStatus('ready')
        })
      return () => {
        ready = false
      }
    }
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

  // The code that was emailed to the address. Codes only sign in to an account
  // that already exists, so a new account still starts with the sign-up form.
  const signInWithCode = useCallback(async ({ email, code }, { remember = true } = {}) => {
    const data = await api('/api/email/verify', {
      method: 'POST',
      auth: false,
      body: { email, code, remember },
    })
    setToken(data.token, remember)
    setConnectionError('')
    setUser(data.user)
    return data.user
  }, [])

  const changePassword = useCallback(async ({ currentPassword, newPassword }) => {
    return api('/api/password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    })
  }, [])

  const signOut = useCallback(() => {
    // Give pending settings a moment to reach the account before the token goes.
    window.dispatchEvent(new Event('luma:before-signout'))
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
      signInWithCode,
      changePassword,
      signOut,
    }),
    [user, status, connectionError, signUp, signIn, signInWithCode, changePassword, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

