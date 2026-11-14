import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import LegalDialog from '../components/LegalDialog'
import { useAuth } from '../lib/useAuth'
import { validateSignup } from '../lib/validation'
import { US_STATES } from '../lib/usStates'

const BLANK = { name: '', dob: '', email: '', password: '', phone: '', state: '' }

export default function Auth() {
  const { signIn, signUp, connectionError } = useAuth()
  const [mode, setMode] = useState('signin')
  const [values, setValues] = useState(BLANK)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [remember, setRemember] = useState(true)
  const [accepted, setAccepted] = useState(false)
  const [legal, setLegal] = useState(null)

  const creating = mode === 'signup'

  function update(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setNotice('')
  }

  function switchMode(next) {
    setMode(next)
    setErrors({})
    setNotice('')
  }

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setNotice('')
    try {
      if (creating) {
        const result = validateSignup({ ...values, acceptedTerms: accepted })
        if (Object.keys(result.errors).length) {
          setErrors(result.errors)
          return
        }
        await signUp(result.clean, { remember })
      } else {
        const next = {}
        if (!values.email.trim()) next.email = 'Enter your email'
        if (!values.password) next.password = 'Enter your password'
        if (Object.keys(next).length) {
          setErrors(next)
          return
        }
        await signIn({ email: values.email, password: values.password }, { remember })
      }
    } catch (error) {
      if (error?.errors && Object.keys(error.errors).length) setErrors(error.errors)
      setNotice(error?.message || 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark" />
          <span className="brand-name">
            Luma
            <span>Ad blocker</span>
          </span>
          <span className="badge accent">Beta</span>
        </div>

        <h1 className="display">{creating ? 'Create your Luma account.' : 'Welcome back.'}</h1>
        <p className="lede">
          {creating
            ? 'One account keeps your protection settings in sync on every device.'
            : 'Sign in to reach your dashboard and counters.'}
        </p>

        <div className="auth-tabs" role="tablist" aria-label="Account">
          <button
            type="button"
            role="tab"
            aria-selected={!creating}
            className="auth-tab"
            onClick={() => switchMode('signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={creating}
            className="auth-tab"
            onClick={() => switchMode('signup')}
          >
            Create account
          </button>
        </div>

        <form className="auth-form" onSubmit={submit} noValidate>
          {creating ? (
            <>
              <div className="field">
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  className="input"
                  autoComplete="name"
                  value={values.name}
                  onChange={(event) => update('name', event.target.value)}
                />
                {errors.name ? <span className="field-error">{errors.name}</span> : null}
              </div>
              <div className="auth-grid">
                <div className="field">
                  <label htmlFor="dob">Date of birth</label>
                  <input
                    id="dob"
                    className="input"
                    type="date"
                    autoComplete="bday"
                    value={values.dob}
                    onChange={(event) => update('dob', event.target.value)}
                  />
                  {errors.dob ? <span className="field-error">{errors.dob}</span> : null}
                </div>
                <div className="field">
                  <label htmlFor="phone">Phone number</label>
                  <input
                    id="phone"
                    className="input"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="(555) 123-4567"
                    value={values.phone}
                    onChange={(event) => update('phone', event.target.value)}
                  />
                  {errors.phone ? <span className="field-error">{errors.phone}</span> : null}
                </div>
              </div>
            </>
          ) : null}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={(event) => update('email', event.target.value)}
            />
            {errors.email ? <span className="field-error">{errors.email}</span> : null}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete={creating ? 'new-password' : 'current-password'}
              value={values.password}
              onChange={(event) => update('password', event.target.value)}
            />
            {errors.password ? <span className="field-error">{errors.password}</span> : null}
          </div>

          {creating ? (
            <div className="field">
              <label htmlFor="state">State of residence</label>
              <select
                id="state"
                className="select"
                value={values.state}
                onChange={(event) => update('state', event.target.value)}
              >
                <option value="">Select your state</option>
                {US_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
              {errors.state ? <span className="field-error">{errors.state}</span> : null}
            </div>
          ) : null}

          <label className="auth-remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            <span>
              Remember me on this device
              <small>You stay signed in here until you sign out.</small>
            </span>
          </label>

          {creating ? (
            <div className="field">
              <label className="auth-remember auth-terms">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(event) => {
                    setAccepted(event.target.checked)
                    setErrors((current) => ({ ...current, terms: undefined }))
                    if (event.target.checked) setLegal('terms')
                  }}
                />
                <span>
                  I agree to the{' '}
                  <button type="button" className="link-btn" onClick={(event) => { event.preventDefault(); setLegal('terms') }}>
                    Terms and Conditions
                  </button>{' '}
                  (including the EULA and Refund Policy) and the{' '}
                  <button type="button" className="link-btn" onClick={(event) => { event.preventDefault(); setLegal('privacy') }}>
                    Privacy Policy
                  </button>
                </span>
              </label>
              {errors.terms ? <span className="field-error">{errors.terms}</span> : null}
            </div>
          ) : null}

          {notice || connectionError ? (
            <div className="auth-notice" role="alert">
              {notice || connectionError}
            </div>
          ) : null}

          <button className="btn primary auth-submit" type="submit" disabled={busy}>
            {creating ? 'Create account' : 'Sign in'}
            <ArrowRight />
          </button>
        </form>

        <p className="auth-note">
          Your account is encrypted and synced, so the same sign-in works on every device you use.
        </p>
      </div>
      {legal ? <LegalDialog initial={legal} onClose={() => setLegal(null)} /> : null}
    </div>
  )
}
