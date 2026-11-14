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

// The addresses that run this deployment. Accounts on these addresses are
// owners no matter how they signed in — password, provider or email code.
const SUPPORT_EMAIL = 'lumasupport@tidio.xyz'
const OWNER_EMAILS = [SUPPORT_EMAIL, '6yokid@gmail.com']
const isOwner = (email) => OWNER_EMAILS.includes(String(email || '').trim().toLowerCase())

// Public addresses used to build provider redirects and to hand a finished
// sign-in back to the app. Filled in by the deployment; derived from the
// request when missing.
const PREVIEW = process.env.BASE44_PREVIEW_MODE === '1'
const PUBLIC_API_URL = String(process.env.PUBLIC_API_URL || '').replace(/\/$/, '')
const WEB_APP_URL = String(process.env.WEB_APP_URL || '').replace(/\/$/, '')
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const EMAIL_FROM = process.env.EMAIL_FROM || `Luma <${SUPPORT_EMAIL}>`
const CODE_TTL = 10 * 60 * 1000

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
  const [salt, hash] = String(stored || '').split(':')
  const expected = Buffer.from(hash || '', 'hex')
  const actual = crypto.scryptSync(password, Buffer.from(salt || '', 'hex'), 64)
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

// Used so an unknown email costs the same time as a wrong password.
const DUMMY_HASH = hashPassword('luma-dummy-password')

// ---------- sign-in providers ----------

// Every provider ends at `profile()`, which answers with the person's email.
// Credentials arrive from the platform secret store; a provider without a
// client id and secret simply reports itself as not connected.
function jwtPayload(token) {
  const part = String(token || '').split('.')[1]
  if (!part) return {}
  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
  } catch {
    return {}
  }
}

async function getJson(url, headers) {
  const response = await fetch(url, { headers })
  const text = await response.text()
  let data = null
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Unexpected reply from ' + new URL(url).host)
  }
  if (!response.ok) throw new Error(data?.error?.message || data?.error || 'Sign-in provider refused the request')
  return data
}

async function postForm(url, form) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form),
  })
  const text = await response.text()
  let data = null
  try {
    data = JSON.parse(text)
  } catch {
    data = Object.fromEntries(new URLSearchParams(text))
  }
  if (!response.ok || data.error) {
    throw new Error(data?.error_description || data?.error || 'Sign-in provider refused the request')
  }
  return data
}

const OAUTH = {
  google: {
    label: 'Google',
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'openid email profile',
    params: { access_type: 'online', prompt: 'select_account' },
    async profile(tokens) {
      const info = await getJson('https://openidconnect.googleapis.com/v1/userinfo', {
        Authorization: 'Bearer ' + tokens.accessToken,
      })
      return { email: info.email, name: info.name }
    },
  },
  microsoft: {
    label: 'Microsoft',
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scope: 'openid email profile',
    params: { prompt: 'select_account' },
    async profile(tokens) {
      const info = await getJson('https://graph.microsoft.com/oidc/userinfo', {
        Authorization: 'Bearer ' + tokens.accessToken,
      })
      return { email: info.email || info.preferred_username, name: info.name }
    },
  },
  github: {
    label: 'GitHub',
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scope: 'read:user user:email',
    async profile(tokens) {
      const headers = {
        Authorization: 'Bearer ' + tokens.accessToken,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Luma',
      }
      const me = await getJson('https://api.github.com/user', headers)
      let email = me.email
      if (!email) {
        const list = await getJson('https://api.github.com/user/emails', headers)
        const pick = list.find((item) => item.primary && item.verified) || list.find((item) => item.verified)
        email = pick?.email
      }
      return { email, name: me.name || me.login }
    },
  },
  apple: {
    label: 'Apple',
    clientId: process.env.APPLE_CLIENT_ID || '',
    clientSecret: process.env.APPLE_CLIENT_SECRET || '',
    authorizeUrl: 'https://appleid.apple.com/auth/authorize',
    tokenUrl: 'https://appleid.apple.com/auth/token',
    scope: 'name email',
    responseMode: 'form_post',
    async profile(tokens) {
      const claims = jwtPayload(tokens.idToken)
      return { email: claims.email, name: '' }
    },
  },
}

function providerList() {
  return Object.entries(OAUTH).map(([id, provider]) => ({
    id,
    label: provider.label,
    configured: Boolean(provider.clientId && provider.clientSecret),
  }))
}

async function exchangeCode(provider, code, redirectUri) {
  const data = await postForm(provider.tokenUrl, {
    grant_type: 'authorization_code',
    code: String(code || ''),
    redirect_uri: redirectUri,
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
  })
  return { accessToken: data.access_token, idToken: data.id_token }
}

// Where this service and the app are reachable. Ports sit side by side
// (`<port>-<host>`), so the app is the same host on port 3000.
function bases(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost:8000').split(',')[0].trim()
  const api = PUBLIC_API_URL || proto + '://' + host
  const web = WEB_APP_URL || proto + '://' + host.replace(/^8000-/, '3000-').replace(/^localhost:8000$/, 'localhost:3000')
  return { api, web }
}

async function sendCodeEmail(email, code) {
  if (!RESEND_API_KEY) return false
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [email],
        subject: 'Your Luma sign-in code: ' + code,
        text:
          'Your Luma sign-in code is ' + code + '.\n\n' +
          'It expires in 10 minutes and can be used once. If you did not ask for it, ignore this email.\n\n' +
          'Luma support: ' + SUPPORT_EMAIL,
      }),
    })
    return response.ok
  } catch {
    return false
  }
}

// Accounts created by a provider or an email code have no password; they are
// matched by email so a password account and a provider sign-in stay the same
// account.
function externalAccount({ email, name, via }) {
  const index = emailIndex(email)
  const existing = db.prepare('SELECT * FROM accounts WHERE email_index = ?').get(index)
  if (existing) return { id: existing.id, profile: open(existing.profile), createdAt: existing.created_at }
  const id = crypto.randomUUID()
  const createdAt = Date.now()
  const profile = {
    name: String(name || email.split('@')[0]).trim().slice(0, 120),
    email,
    via,
    terms: { version: TERMS_VERSION, acceptedAt: new Date(createdAt).toISOString(), via },
  }
  db.prepare(
    'INSERT INTO accounts (id, email_index, profile, password, settings, created_at) VALUES (?, ?, ?, ?, NULL, ?)',
  ).run(id, index, seal(profile), '', createdAt)
  return { id, profile, createdAt }
}

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
  const { name, email, phone, state, dob, via } = profile
  return {
    id,
    name,
    email,
    phone,
    state,
    dob,
    // Owners are decided by address, so an owner account created before this
    // list existed is an owner too.
    owner: isOwner(email),
    via: via || 'password',
    createdAt: new Date(createdAt).toISOString(),
  }
}

// ---------- throttling ----------

const attempts = new Map()
// Short-lived, single-use values: provider state, post-provider tickets and
// emailed sign-in codes.
const oauthStates = new Map()
const tickets = new Map()
const emailCodes = new Map()

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
  for (const store of [oauthStates, tickets, emailCodes]) {
    for (const [key, entry] of store) {
      if (entry.expiresAt < now) store.delete(key)
    }
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

// Provider callbacks (Apple posts a form) can arrive URL-encoded, not JSON.
function readParams(req, limit = 64 * 1024) {
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
    req.on('end', () => resolve(new URLSearchParams(Buffer.concat(chunks).toString('utf8'))))
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
    const valid = checkPassword(password, row && row.password ? row.password : DUMMY_HASH)
    if (!row || !valid) {
      noteAttempt(key)
      return send(res, 401, { error: 'Email or password is incorrect' })
    }
    attempts.delete(key)
    const token = startSession(row.id, body.remember !== false)
    return send(res, 200, { token, user: publicProfile(row.id, open(row.profile), row.created_at) })
  }

  // ---------- public sign-in routes ----------

  if (route === 'GET /api/auth/providers') {
    return send(res, 200, {
      providers: providerList(),
      emailCode: true,
      emailDelivery: Boolean(RESEND_API_KEY),
    })
  }

  const oauthRoute = url.pathname.match(/^\/api\/oauth\/([a-z]+)\/(start|callback)$/)
  const provider = oauthRoute ? OAUTH[oauthRoute[1]] : null
  if (oauthRoute && !provider) return send(res, 404, { error: 'Unknown sign-in provider' })

  if (provider && oauthRoute[2] === 'start') {
    if (!provider.clientId || !provider.clientSecret) {
      return send(res, 503, { error: provider.label + ' sign-in is not connected yet' })
    }
    const state = crypto.randomBytes(24).toString('base64url')
    oauthStates.set(state, {
      provider: oauthRoute[1],
      remember: url.searchParams.get('remember') !== '0',
      expiresAt: Date.now() + CODE_TTL,
    })
    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: bases(req).api + '/api/oauth/' + oauthRoute[1] + '/callback',
      response_type: 'code',
      scope: provider.scope,
      state,
    })
    for (const [name, value] of Object.entries(provider.params || {})) params.set(name, value)
    if (provider.responseMode) params.set('response_mode', provider.responseMode)
    res.writeHead(302, { Location: provider.authorizeUrl + '?' + params.toString() })
    return res.end()
  }

  if (provider && oauthRoute[2] === 'callback') {
    const params = req.method === 'POST' ? await readParams(req) : url.searchParams
    const state = params.get('state') || ''
    const pending = state ? oauthStates.get(state) : null
    oauthStates.delete(state)
    const backToApp = (query) => {
      res.writeHead(302, { Location: bases(req).web + '/?' + query })
      return res.end()
    }
    if (!pending || pending.provider !== oauthRoute[1] || pending.expiresAt < Date.now()) {
      return backToApp('auth_error=' + encodeURIComponent('That sign-in link expired. Try again.'))
    }
    if (params.get('error')) return backToApp('auth_error=' + encodeURIComponent('Sign-in was cancelled.'))
    try {
      const tokens = await exchangeCode(
        provider,
        params.get('code'),
        bases(req).api + '/api/oauth/' + oauthRoute[1] + '/callback',
      )
      const info = await provider.profile(tokens)
      const accountEmail = String(info.email || '').trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail)) {
        return backToApp(
          'auth_error=' + encodeURIComponent('That account did not share an email address. Try another way to sign in.'),
        )
      }
      const account = externalAccount({ email: accountEmail, name: info.name, via: oauthRoute[1] })
      const ticket = crypto.randomBytes(24).toString('base64url')
      tickets.set(ticket, {
        accountId: account.id,
        remember: pending.remember,
        expiresAt: Date.now() + 2 * 60 * 1000,
      })
      return backToApp('luma_ticket=' + ticket)
    } catch (error) {
      console.error('Sign-in with ' + provider.label + ' failed:', error.message)
      return backToApp('auth_error=' + encodeURIComponent('That sign-in did not finish. Try again.'))
    }
  }

  if (route === 'POST /api/session/ticket') {
    const body = await readBody(req)
    const ticket = String(body.ticket || '')
    const pending = tickets.get(ticket)
    tickets.delete(ticket)
    if (!pending || pending.expiresAt < Date.now()) {
      return send(res, 401, { error: 'That sign-in link expired. Try again.' })
    }
    const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(pending.accountId)
    if (!row) return send(res, 401, { error: 'That sign-in link expired. Try again.' })
    const token = startSession(row.id, pending.remember)
    return send(res, 200, { token, user: publicProfile(row.id, open(row.profile), row.created_at) })
  }

  if (route === 'POST /api/email/start') {
    const body = await readBody(req)
    const email = String(body.email || '').trim().toLowerCase()
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return send(res, 422, { error: 'Enter a valid email address' })
    }
    const index = emailIndex(email)
    const key = 'code:' + clientKey(req, index)
    if (tooManyAttempts(key)) {
      return send(res, 429, { error: 'Too many codes requested. Wait a few minutes and try again.' })
    }
    noteAttempt(key)
    // Emailed codes sign in to an account that already exists; they never create one.
    const known = db.prepare('SELECT id FROM accounts WHERE email_index = ?').get(index)
    if (!known) {
      return send(res, 404, { error: 'No Luma account uses that email. Create an account first.' })
    }
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0')
    emailCodes.set(index, { hash: sha256(code), expiresAt: Date.now() + CODE_TTL, attempts: 0 })
    const delivered = await sendCodeEmail(email, code)
    if (!delivered && !PREVIEW) {
      emailCodes.delete(index)
      return send(res, 503, { error: 'Email sign-in is not available right now. Use your password instead.' })
    }
    // The sandbox preview has no mail provider, so the code comes back with the
    // reply there. Outside preview mode a code is only ever sent by email.
    return send(res, 200, { ok: true, delivered, devCode: delivered ? undefined : code })
  }

  if (route === 'POST /api/email/verify') {
    const body = await readBody(req)
    const email = String(body.email || '').trim().toLowerCase()
    const code = String(body.code || '').replace(/\D/g, '')
    const index = email ? emailIndex(email) : ''
    const pending = index ? emailCodes.get(index) : null
    const key = 'verify:' + clientKey(req, email)
    if (tooManyAttempts(key)) return send(res, 429, { error: 'Too many attempts. Request a new code.' })
    if (!pending || pending.expiresAt < Date.now() || pending.attempts >= 5 || sha256(code) !== pending.hash) {
      if (pending) {
        pending.attempts += 1
        if (pending.attempts >= 5) emailCodes.delete(index)
      }
      noteAttempt(key)
      return send(res, 401, { error: 'That code is not valid. Check it, or request a new one.' })
    }
    emailCodes.delete(index)
    attempts.delete(key)
    const found = db.prepare('SELECT * FROM accounts WHERE email_index = ?').get(index)
    if (!found) {
      return send(res, 404, { error: 'No Luma account uses that email. Create an account first.' })
    }
    const account = { id: found.id, profile: open(found.profile), createdAt: found.created_at }
    const token = startSession(account.id, body.remember !== false)
    return send(res, 200, { token, user: publicProfile(account.id, account.profile, account.createdAt) })
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

  if (route === 'POST /api/password') {
    const body = await readBody(req)
    const current = String(body.currentPassword || '')
    const next = String(body.newPassword || '')
    const row = db.prepare('SELECT password FROM accounts WHERE id = ?').get(session.accountId)
    // Accounts started with a provider or an emailed code have no password yet,
    // so the first one can be chosen without proving an old one.
    if (row?.password && !checkPassword(current, row.password)) {
      return send(res, 401, { error: 'That current password is not right' })
    }
    if (next.length < 8 || next.length > 200) {
      return send(res, 422, {
        error: 'Use at least 8 characters',
        errors: { newPassword: 'Use at least 8 characters' },
      })
    }
    db.prepare('UPDATE accounts SET password = ? WHERE id = ?').run(
      hashPassword(next),
      session.accountId,
    )
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
    // Quiet hours are optional: a client that does not send them must not wipe them.
    if (input.schedule && typeof input.schedule === 'object') {
      settings.schedule = {
        enabled: Boolean(input.schedule.enabled),
        from: String(input.schedule.from || '22:00').slice(0, 5),
        to: String(input.schedule.to || '07:00').slice(0, 5),
      }
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
