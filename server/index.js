// Luma account service.
//
// Stores accounts so one sign-in works on every device, and syncs each
// account's protection settings. Dependency-free (Node built-ins only).
//
// Protection of stored data:
//   - Profile fields (name, email, phone, date of birth, state, consent record)
//     and synced settings are sealed with AES-256-GCM before they touch disk.
//   - Emails are looked up through an HMAC "blind index", never stored in clear.
//   - Passwords are hashed with scrypt (per-account salt); session tokens are
//     stored only as SHA-256 hashes.
//   - The keys derive from ACCOUNT_ENCRYPTION_KEY, which lives in the platform
//     secret store, never in the repository or the database volume.
//   - Browsers reach this service over HTTPS in any real deployment.
import http from 'node:http'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const PORT = Number(process.env.PORT || 8000)
const DATA_DIR = process.env.DATA_DIR || path.resolve('server-data')
const MASTER = process.env.ACCOUNT_ENCRYPTION_KEY || ''
const TERMS_VERSION = '2026-11-13'

if (MASTER.length < 16) {
  console.error('ACCOUNT_ENCRYPTION_KEY is missing or too short; refusing to start.')
  process.exit(1)
}

const derive = (label) =>
  Buffer.from(crypto.hkdfSync('sha256', MASTER, 'luma-accounts-v1', label, 32))
const ENC_KEY = derive('encrypt')
const INDEX_KEY = derive('email-index')

fs.mkdirSync(DATA_DIR, { recursive: true })
const db = new DatabaseSync(path.join(DATA_DIR, 'luma.db'))
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    email_index TEXT NOT NULL UNIQUE,
    profile TEXT NOT NULL,
    password TEXT NOT NULL,
    settings TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
`)

// ---------- crypto helpers ----------

function seal(value) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv)
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), body.toString('base64')].join('.')
}

function open(sealed) {
  const [version, iv, tag, body] = String(sealed).split('.')
  if (version !== 'v1') throw new Error('Unknown record format')
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  const text = Buffer.concat([decipher.update(Buffer.from(body, 'base64')), decipher.final()])
  return JSON.parse(text.toString('utf8'))
}

const emailIndex = (email) => crypto.createHmac('sha256', INDEX_KEY).update(email).digest('hex')
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex')

function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, 64)
  return salt.toString('hex') + ':' + hash.toString('hex')
}

function checkPassword(password, stored) {
  const [salt, hash] = String(stored).split(':')
  const expected = Buffer.from(hash || '', 'hex')
  const actual = crypto.scryptSync(password, Buffer.from(salt || '', 'hex'), 64)
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

// Used so an unknown email costs the same time as a wrong password.
const DUMMY_HASH = hashPassword('luma-dummy-password')

// ---------- validation ----------

const STATES = new Set(
  'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '),
)

function ageFromDob(dob) {
  const birth = new Date(dob + 'T00:00:00Z')
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let age = now.getUTCFullYear() - birth.getUTCFullYear()
  const month = now.getUTCMonth() - birth.getUTCMonth()
  if (month < 0 || (month === 0 && now.getUTCDate() < birth.getUTCDate())) age -= 1
  return age
}

function validateSignup(body) {
  const errors = {}
  const name = String(body.name || '').trim().replace(/\s+/g, ' ')
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const phone = String(body.phone || '').replace(/\D/g, '')
  const state = String(body.state || '')
  const dob = String(body.dob || '')

  if (name.length < 2 || name.length > 120) errors.name = 'Enter your full name'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) errors.dob = 'Enter your date of birth'
  else {
    const age = ageFromDob(dob)
    if (age === null || age > 120) errors.dob = 'Enter a valid date of birth'
    else if (age < 13) errors.dob = 'You must be at least 13 to create an account'
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address'
  if (password.length < 8 || password.length > 200) errors.password = 'Use at least 8 characters'
  if (phone.length !== 10) errors.phone = 'Enter a 10-digit phone number'
  if (!STATES.has(state)) errors.state = 'Select your state'
  if (body.acceptedTerms !== true) errors.terms = 'Accept the Terms and Privacy Policy to continue'

  return { errors, clean: { name, email, password, phone, state, dob } }
}

// ---------- sessions ----------

const DAY = 24 * 60 * 60 * 1000

function startSession(accountId, remember) {
  const token = crypto.randomBytes(32).toString('base64url')
  const expires = Date.now() + (remember ? 180 * DAY : 12 * 60 * 60 * 1000)
  db.prepare('INSERT INTO sessions (token_hash, account_id, expires_at) VALUES (?, ?, ?)').run(
    sha256(token),
    accountId,
    expires,
  )
  return token
}

function sessionFor(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return null
  const row = db
    .prepare('SELECT account_id, expires_at FROM sessions WHERE token_hash = ?')
    .get(sha256(token))
  if (!row) return null
  if (row.expires_at < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token))
    return null
  }
  return { token, accountId: row.account_id }
}

function publicProfile(id, profile, createdAt) {
  const { name, email, phone, state, dob } = profile
  return { id, name, email, phone, state, dob, createdAt: new Date(createdAt).toISOString() }
}

// ---------- throttling ----------

const attempts = new Map()

function tooManyAttempts(key) {
  const now = Date.now()
  const recent = (attempts.get(key) || []).filter((time) => now - time < 10 * 60 * 1000)
  attempts.set(key, recent)
  return recent.length >= 8
}

function noteAttempt(key) {
  attempts.set(key, [...(attempts.get(key) || []), Date.now()])
}

setInterval(() => {
  const now = Date.now()
  for (const [key, list] of attempts) {
    if (!list.some((time) => now - time < 10 * 60 * 1000)) attempts.delete(key)
  }
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now)
}, 10 * 60 * 1000).unref()

// ---------- http ----------

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  })
  res.end(JSON.stringify(body))
}

function readBody(req, limit = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(Object.assign(new Error('Request too large'), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {})
      } catch {
        reject(Object.assign(new Error('Invalid request'), { status: 400 }))
      }
    })
    req.on('error', reject)
  })
}

function clientKey(req, extra) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '') + '|' + extra
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost')
  const route = req.method + ' ' + url.pathname

  if (req.method === 'OPTIONS') return send(res, 204, {})
  if (route === 'GET /api/health') return send(res, 200, { ok: true })

  if (route === 'POST /api/signup') {
    const body = await readBody(req)
    const { errors, clean } = validateSignup(body)
    if (Object.keys(errors).length) return send(res, 422, { error: 'Check the highlighted fields', errors })

    const index = emailIndex(clean.email)
    if (db.prepare('SELECT 1 FROM accounts WHERE email_index = ?').get(index)) {
      return send(res, 409, { error: 'An account with that email already exists. Try signing in.' })
    }
    const id = crypto.randomUUID()
    const createdAt = Date.now()
    const profile = {
      name: clean.name,
      email: clean.email,
      phone: clean.phone,
      state: clean.state,
      dob: clean.dob,
      terms: { version: TERMS_VERSION, acceptedAt: new Date(createdAt).toISOString() },
    }
    db.prepare(
      'INSERT INTO accounts (id, email_index, profile, password, settings, created_at) VALUES (?, ?, ?, ?, NULL, ?)',
    ).run(id, index, seal(profile), hashPassword(clean.password), createdAt)

    const token = startSession(id, body.remember !== false)
    return send(res, 201, { token, user: publicProfile(id, profile, createdAt) })
  }

  if (route === 'POST /api/signin') {
    const body = await readBody(req)
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const key = clientKey(req, email)
    if (tooManyAttempts(key)) {
      return send(res, 429, { error: 'Too many attempts. Wait a few minutes and try again.' })
    }
    const row = email
      ? db.prepare('SELECT * FROM accounts WHERE email_index = ?').get(emailIndex(email))
      : null
    const valid = checkPassword(password, row ? row.password : DUMMY_HASH)
    if (!row || !valid) {
      noteAttempt(key)
      return send(res, 401, { error: 'Email or password is incorrect' })
    }
    attempts.delete(key)
    const token = startSession(row.id, body.remember !== false)
    return send(res, 200, { token, user: publicProfile(row.id, open(row.profile), row.created_at) })
  }

  const session = sessionFor(req)
  if (!session) return send(res, 401, { error: 'Please sign in again' })

  if (route === 'GET /api/me') {
    const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(session.accountId)
    if (!row) return send(res, 401, { error: 'Please sign in again' })
    return send(res, 200, { user: publicProfile(row.id, open(row.profile), row.created_at) })
  }

  if (route === 'POST /api/signout') {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(session.token))
    return send(res, 200, { ok: true })
  }

  if (route === 'GET /api/settings') {
    const row = db.prepare('SELECT settings FROM accounts WHERE id = ?').get(session.accountId)
    return send(res, 200, { settings: row?.settings ? open(row.settings) : null })
  }

  if (route === 'PUT /api/settings') {
    const body = await readBody(req)
    const input = body.settings
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return send(res, 422, { error: 'Invalid settings' })
    }
    const settings = {
      protection: input.protection !== false,
      lists: input.lists && typeof input.lists === 'object' ? input.lists : {},
      customRules: Array.isArray(input.customRules) ? input.customRules.map(String).slice(0, 500) : [],
      allowlist: Array.isArray(input.allowlist) ? input.allowlist.map(String).slice(0, 500) : [],
    }
    db.prepare('UPDATE accounts SET settings = ? WHERE id = ?').run(seal(settings), session.accountId)
    return send(res, 200, { ok: true })
  }

  return send(res, 404, { error: 'Not found' })
}

http
  .createServer((req, res) => {
    handle(req, res).catch((error) => {
      const status = error.status || 500
      if (status === 500) console.error(error)
      if (!res.headersSent) send(res, status, { error: status === 500 ? 'Something went wrong' : error.message })
    })
  })
  .listen(PORT, '0.0.0.0', () => console.log('Luma account service listening on ' + PORT))
