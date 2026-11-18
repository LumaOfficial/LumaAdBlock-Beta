import { useState } from 'react'
import {
  BookOpen,
  Briefcase,
  Building2,
  Car,
  CloudSun,
  Code2,
  Cpu,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Mail,
  MessageCircle,
  Music,
  Newspaper,
  Palette,
  Plane,
  PlaySquare,
  Plug,
  Search,
  ShoppingBag,
  Trophy,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import { CardHead, Switch } from '../ui'
import { useApp } from '../../lib/useApp'
import { compileRules, cosmeticFor, hostMatches, screenRequest } from '../../lib/engine'
import { INTEGRATIONS } from '../../lib/integrations'

const ICONS = {
  Email: Mail,
  Code: Code2,
  Chat: MessageCircle,
  Work: Briefcase,
  News: Newspaper,
  Sports: Trophy,
  Technology: Cpu,
  Developers: Code2,
  Social: Users,
  Video: PlaySquare,
  Music: Music,
  Gaming: Gamepad2,
  Shopping: ShoppingBag,
  Food: UtensilsCrossed,
  Travel: Plane,
  Finance: Landmark,
  Health: HeartPulse,
  Home: Home,
  Autos: Car,
  'Property & jobs': Building2,
  Learning: GraduationCap,
  Reference: BookOpen,
  Business: Briefcase,
  'Pets & art': Palette,
  Weather: CloudSun,
}

/** What Luma would clear on this platform with the protection turned on now. */
function coverage(platform, context) {
  const compiled = compileRules(platform.lines, 'integration:' + platform.id)
  const rules = [...context.rules, ...compiled]
  const { hide } = cosmeticFor(platform.site, rules)
  const hiding = new Set(hide.map((rule) => rule.selector))
  const cosmetic = compiled.filter(
    (rule) => rule.kind === 'cosmetic' && !rule.exception && hiding.has(rule.selector),
  ).length
  const network = (platform.checks || []).filter(
    (check) => screenRequest(check, { ...context, rules, pageHost: platform.site }).blocked,
  ).length
  return {
    covered: cosmetic + network,
    total: compiled.filter((rule) => rule.kind === 'cosmetic').length + (platform.checks || []).length,
    paused: context.pausedSites.some((host) => hostMatches(platform.site, host)),
  }
}

/**
 * The platforms a person already uses, in one place. Connecting one turns on a
 * small pack of rules that clears that platform's ads while they browse it;
 * the check tells them exactly how much that covers today. The catalogue is
 * long, so it is compact, searchable and grouped by the kind of site.
 */
export default function Integrations() {
  const { state, rules, protectionNow, connectIntegration, disconnectIntegration } = useApp()
  const [checks, setChecks] = useState({})
  const [query, setQuery] = useState('')
  const connected = state.integrations
  const allConnected = connected.length === INTEGRATIONS.length
  const placements = INTEGRATIONS.filter((item) => connected.includes(item.id)).reduce(
    (sum, item) => sum + item.removes.length,
    0,
  )

  const check = (platform) => {
    setChecks((previous) => ({
      ...previous,
      [platform.id]: coverage(platform, {
        rules,
        allowlist: state.allowlist,
        pausedSites: state.pausedSites,
        protection: protectionNow,
      }),
    }))
  }

  const verdict = (platform) => {
    const result = checks[platform.id]
    if (!result) return ''
    if (!protectionNow) return 'Protection is paused, so nothing is removed right now.'
    if (result.paused) return 'You paused this site, so Luma leaves it alone.'
    const verb = connected.includes(platform.id) ? 'cleared' : 'ready to clear'
    return `${result.covered} of ${result.total} placements ${verb} here.`
  }

  // One group per kind of site, in catalogue order, so a long list still reads
  // as subjects rather than a wall of names.
  const needle = query.trim().toLowerCase()
  const matches = needle
    ? INTEGRATIONS.filter((item) =>
        (item.label + ' ' + item.kind + ' ' + item.site).toLowerCase().includes(needle),
      )
    : INTEGRATIONS
  const groups = []
  for (const platform of matches) {
    let group = groups.find((entry) => entry.name === platform.kind)
    if (!group) {
      group = { name: platform.kind, platforms: [] }
      groups.push(group)
    }
    group.platforms.push(platform)
  }

  return (
    <div className="stack">
      <section className="card">
        <CardHead
          title="Your platforms"
          sub={`${connected.length} of ${INTEGRATIONS.length} connected`}
        >
          <span className="badge plain">
            <Plug />
            {connected.length ? `${placements} placements` : 'None yet'}
          </span>
        </CardHead>
        <p className="small muted" style={{ marginTop: -4 }}>
          Connect a platform and Luma clears its ads, sponsored posts and promos while you use its
          website. Everything happens in this browser; it never signs in to your accounts and nothing
          is sent anywhere.
        </p>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
          <button
            type="button"
            className="btn"
            disabled={allConnected}
            onClick={() => INTEGRATIONS.forEach((item) => connectIntegration(item.id))}
          >
            <Plug />
            Clean up every platform
          </button>
          {connected.length ? (
            <button
              type="button"
              className="btn ghost"
              onClick={() => connected.forEach((id) => disconnectIntegration(id))}
            >
              Disconnect all
            </button>
          ) : null}
        </div>
      </section>

      <div className="field" style={{ maxWidth: 360 }}>
        <label htmlFor="platform-search">Find a platform</label>
        <input
          id="platform-search"
          className="input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="A site or a kind, like news"
          spellCheck="false"
        />
      </div>

      {!matches.length ? (
        <p className="hint">No platforms match that yet.</p>
      ) : null}

      {groups.map((group) => (
        <div key={group.name}>
          <div className="eyebrow" style={{ margin: '6px 0 10px' }}>
            {group.name} · {group.platforms.length}
          </div>
          <div className="int-grid">
            {group.platforms.map((platform) => {
              const Icon = ICONS[platform.kind] || Plug
              const on = connected.includes(platform.id)
              return (
                <div key={platform.id} className="int-tile" data-on={on ? 'true' : 'false'} title={platform.blurb}>
                  <span className="feed-icon">
                    <Icon />
                  </span>
                  <span className="int-name">
                    <span className="int-label">{platform.label}</span>
                    <span className="int-kind">{on ? 'Connected' : platform.kind}</span>
                  </span>
                  <button
                    type="button"
                    className="int-check"
                    aria-label={'Check ' + platform.label}
                    title={'Check what Luma clears on ' + platform.label}
                    onClick={() => check(platform)}
                  >
                    <Search width={13} height={13} />
                  </button>
                  <Switch
                    on={on}
                    onChange={(next) =>
                      next ? connectIntegration(platform.id) : disconnectIntegration(platform.id)
                    }
                    label={'Clean up ' + platform.label}
                  />
                  {checks[platform.id] ? (
                    <span className="int-verdict">{verdict(platform)}</span>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <p className="footer-note">
        Luma cleans each platform’s website, the only place a browser extension can see its ads.
        Desktop and mobile apps are not covered.
      </p>
    </div>
  )
}
