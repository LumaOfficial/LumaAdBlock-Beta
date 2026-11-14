import { US_STATES } from './usStates'

/**
 * Account form validation, shared by the sign-up form and the account service.
 *
 * Kept out of auth.jsx: exporting plain functions from the provider module
 * stopped Fast Refresh, so every edit force-reloaded the page mid-form.
 */
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
