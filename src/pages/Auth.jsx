import { useEffect, useState } from 'react'
import { ArrowRight, Mail } from 'lucide-react'
import LegalDialog from '../components/LegalDialog'
import SsoButtons from '../components/SsoButtons'
import { useAuth } from '../lib/useAuth'
import { validateSignup } from '../lib/validation'
import { US_STATES } from '../lib/usStates'
import { fetchAuthOptions, providerStartUrl, requestEmailCode } from '../lib/sso'

const BLANK = { name: '', dob: '', email: '', password: '', phone: '', state: '' }
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Terms({ accepted, error, onChange, onOpen }) {
  return (
    <div className="field">
      <label className="auth-remember auth-terms">
        <input type="checkbox" checked={accepted} onChange={(event) => onChange(event.target.checked)} />
        <span>
          I agree to the{' '}
          <button
            type="button"
            className="link-btn"
            onClick={(event) => {
              event.preventDefault()
              onOpen('terms')
            }}
          >
            Terms and Conditions
          </button>{' '}
          (including the EULA and Refund Policy) and the{' '}
          <button
            type="button"
            className="link-btn"
            onClick={(event) => {
              event.preventDefault()
              onOpen('privacy')
            }}
          >
            Privacy Policy
          </button>
        </span>
      </label>
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  )
}

export default function Auth() {
  const { signIn, signUp, signInWithCode, connectionError } = useAuth()
  const [mode, setMode] = useState('signin')
  const [values, setValues] = useState(BLANK)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [remember, setRemember] = useState(true)
  const [accepted, setAccepted] = useState(false)
  const [legal, setLegal] = useState(null)
  const [providers, setProviders] = useState(null)
  // Email code sign-in: ask for the address, then for the code.
  const [codeStep, setCodeStep] = useState('email')
  const [code, setCode] = useState('')
  const [handoff, setHandoff] = useState('')

  const creating = mode === 'signup'
  const coding = mode === 'code'

  useEffect(() => {
    let alive = true
    fetchAuthOptions()
      .then((data) => alive && setProviders(data.providers))
      .catch(() => {
        /* an empty list means "unknown": let the provider speak for itself */
        if (alive) setProviders([])
      })
    return () => {
      alive = false
    }
  }, [])

  function update(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setNotice('')
  }

  function switchMode(next) {
    setMode(next)
    setErrors({})
    setNotice('')
    setHandoff('')
    setCode('')
    setCodeStep('email')
  }

  // Only providers the account service holds credentials for are offered, so a
  // missing client id/secret never shows up as a button that cannot work.
  const connected = (providers || []).filter((item) => item.configured)

  function startProvider(provider) {
    setNotice('')
    window.location.assign(providerStartUrl(provider.id, remember))
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

  async function sendCode(event) {
    event.preventDefault()
    if (busy) return
    const email = values.email.trim().toLowerCase()
    const next = {}
    if (!EMAIL_PATTERN.test(email)) next.email = 'Enter a valid email address'
    if (!accepted) next.terms = 'Accept the Terms and Privacy Policy to continue'
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    setBusy(true)
    setNotice('')
    try {
      const data = await requestEmailCode(email)
      setErrors({})
      setCode('')
      setCodeStep('code')
      setHandoff(
        data.devCode
          ? 'No mail service is connected yet, so here is your code: ' + data.devCode
          : 'We emailed a 6-digit code to ' + email + '. It works once and expires in 10 minutes.',
      )
    } catch (error) {
      setNotice(error?.message || 'Could not send the code. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function submitCode(event) {
    event.preventDefault()
    if (busy) return
    setNotice('')
    if (code.replace(/\D/g, '').length !== 6) {
      setErrors({ code: 'Enter the 6-digit code' })
      return
    }
    setBusy(true)
    try {
      await signInWithCode({ email: values.email, code, acceptedTerms: accepted }, { remember })
    } catch (error) {
      if (error?.errors && Object.keys(error.errors).length) setErrors(error.errors)
      setNotice(error?.message || 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const heading = creating ? 'Create your Luma account.' : coding ? 'Sign in with a code.' : 'Welcome back.'
  const lede = creating
    ? 'One account keeps your protection settings in sync on every device.'
    : coding
      ? 'Enter your email and we send a 6-digit code. No password to remember.'
      : 'Sign in to reach your dashboard and counters.'

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

        <h1 className="display">{heading}</h1>
        <p className="lede">{lede}</p>

        <div className="auth-tabs tabs-3" role="tablist" aria-label="Account">
          <button type="button" role="tab" aria-selected={mode === 'signin'} className="auth-tab" onClick={() => switchMode('signin')}>
            Sign in
          </button>
          <button type="button" role="tab" aria-selected={creating} className="auth-tab" onClick={() => switchMode('signup')}>
            Create account
          </button>
          <button type="button" role="tab" aria-selected={coding} className="auth-tab" onClick={() => switchMode('code')}>
            Email code
          </button>
        </div>

        {coding || connected.length === 0 ? null : (
          <>
            <SsoButtons providers={connected} busy={busy} onPick={startProvider} />
            <div className="auth-divider">
              <span>or use your email</span>
            </div>
          </>
        )}

        {coding ? (
          <form className="auth-form" onSubmit={codeStep === 'code' ? submitCode : sendCode} noValidate>
            <div className="field">
              <label htmlFor="code-email">Email</label>
              <input
                id="code-email"
                className="input"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={(event) => update('email', event.target.value)}
              />
              {errors.email ? <span className="field-error">{errors.email}</span> : null}
            </div>

            <Terms
              accepted={accepted}
              error={errors.terms}
              onChange={(value) => {
                setAccepted(value)
                setErrors((current) => ({ ...current, terms: undefined }))
                if (value) setLegal('terms')
              }}
              onOpen={setLegal}
            />

            {codeStep === 'code' ? (
              <div className="field">
                <label htmlFor="code">6-digit code</label>
                <input
                  id="code"
                  className="input code-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                    setErrors((current) => ({ ...current, code: undefined }))
                  }}
                />
                {errors.code ? <span className="field-error">{errors.code}</span> : null}
              </div>
            ) : null}

            {handoff ? (
              <div className="auth-notice" role="status">
                <Mail aria-hidden="true" className="auth-notice-icon" />
                <span>{handoff}</span>
              </div>
            ) : null}

            <label className="auth-remember">
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
              <span>
                Remember me on this device
                <small>You stay signed in here until you sign out.</small>
              </span>
            </label>

            {notice || connectionError ? (
              <div className="auth-notice" role="alert">
                {notice || connectionError}
              </div>
            ) : null}

            <button className="btn primary auth-submit" type="submit" disabled={busy}>
              {codeStep === 'code' ? 'Sign in with code' : 'Email me a code'}
              <ArrowRight />
            </button>

            {codeStep === 'code' ? (
              <button type="button" className="link-btn auth-swap" onClick={sendCode} disabled={busy}>
                Send a new code
              </button>
            ) : null}
          </form>
        ) : (
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
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
              <span>
                Remember me on this device
                <small>You stay signed in here until you sign out.</small>
              </span>
            </label>

            {creating ? (
              <Terms
                accepted={accepted}
                error={errors.terms}
                onChange={(value) => {
                  setAccepted(value)
                  setErrors((current) => ({ ...current, terms: undefined }))
                  if (value) setLegal('terms')
                }}
                onOpen={setLegal}
              />
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
        )}

        <p className="auth-note">
          Your account is encrypted and synced, so the same sign-in works on every device you use.
        </p>
      </div>
      {legal ? <LegalDialog initial={legal} onClose={() => setLegal(null)} /> : null}
    </div>
  )
}
