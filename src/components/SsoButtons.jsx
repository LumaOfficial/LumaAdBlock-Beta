import { Apple, Github } from 'lucide-react'
import { SSO_PROVIDERS } from '../lib/sso'

// Provider marks: line icons where the set has one, drawn marks otherwise.
function Mark({ id }) {
  if (id === 'github') return <Github aria-hidden="true" />
  if (id === 'apple') return <Apple aria-hidden="true" />
  if (id === 'microsoft') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="8" height="8" fill="#F25022" />
        <rect x="13" y="3" width="8" height="8" fill="#7FBA00" />
        <rect x="3" y="13" width="8" height="8" fill="#00A4EF" />
        <rect x="13" y="13" width="8" height="8" fill="#FFB900" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <text x="12" y="18" textAnchor="middle" fontSize="19" fontWeight="700" fill="#4285F4" fontFamily="system-ui, sans-serif">
        G
      </text>
    </svg>
  )
}

/** One button per provider. Picking one leaves the app for that provider. */
export default function SsoButtons({ busy, onPick }) {
  return (
    <div className="sso-grid">
      {SSO_PROVIDERS.map((provider) => (
        <button
          key={provider.id}
          type="button"
          className="sso-btn"
          disabled={busy}
          onClick={() => onPick(provider)}
        >
          <span className="sso-mark">
            <Mark id={provider.id} />
          </span>
          <span className="sso-label">{provider.label}</span>
        </button>
      ))}
    </div>
  )
}
