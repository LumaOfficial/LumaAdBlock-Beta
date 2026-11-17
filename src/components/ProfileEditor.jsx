import { useState } from 'react'
import { Save } from 'lucide-react'
import { useAuth } from '../lib/useAuth'
import { US_STATES } from '../lib/usStates'

/**
 * The details an account may change about itself. The email is the account's
 * identity, so it is shown but never edited here.
 */
export default function ProfileEditor({ user }) {
  const { updateProfile } = useAuth()
  const [values, setValues] = useState({
    name: user?.name || '',
    state: user?.state || '',
    phone: user?.phone || '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const update = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
    setSaved(false)
  }

  const dirty =
    values.name !== (user?.name || '') ||
    values.state !== (user?.state || '') ||
    values.phone !== (user?.phone || '')

  async function submit(event) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setErrors({})
    try {
      await updateProfile(values)
      setSaved(true)
    } catch (error) {
      setErrors({ ...(error.errors || {}), form: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 12 }}>
      <div className="field">
        <label htmlFor="profile-name">Name</label>
        <input
          id="profile-name"
          className="input"
          autoComplete="name"
          value={values.name}
          onChange={(event) => update('name', event.target.value)}
        />
        {errors.name ? <span className="field-error">{errors.name}</span> : null}
      </div>

      <div className="field" style={{ marginTop: 10 }}>
        <label htmlFor="profile-state">Region</label>
        <select
          id="profile-state"
          className="select"
          value={values.state}
          onChange={(event) => update('state', event.target.value)}
        >
          <option value="">Not set</option>
          {US_STATES.map((state) => (
            <option key={state.code} value={state.code}>
              {state.name}
            </option>
          ))}
        </select>
        {errors.state ? <span className="field-error">{errors.state}</span> : null}
      </div>

      <div className="field" style={{ marginTop: 10 }}>
        <label htmlFor="profile-phone">Phone</label>
        <input
          id="profile-phone"
          className="input"
          inputMode="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={(event) => update('phone', event.target.value)}
        />
        {errors.phone ? <span className="field-error">{errors.phone}</span> : null}
      </div>

      {errors.form ? (
        <p className="field-error" style={{ marginTop: 8 }}>
          {errors.form}
        </p>
      ) : null}

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn primary" type="submit" disabled={saving || !dirty}>
          <Save />
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        {saved && !dirty ? <span className="small muted">Saved to your account</span> : null}
      </div>
    </form>
  )
}
