import { Eye, EyeOff } from 'lucide-react'
import { useApp } from '../lib/useApp'
import { CardHead } from './ui'

const STYLES = [
  {
    id: 'hidden',
    label: 'Hidden',
    sub: 'Ads just disappear',
    icon: EyeOff,
  },
  {
    id: 'visual',
    label: 'Visual',
    sub: 'See each ad go',
    icon: Eye,
  },
]

/**
 * How the blocker shows its work on a page. Hidden is silent, so pages look
 * untouched; Visual outlines every slot for a moment so it is obvious what was
 * removed and nothing useful went with it.
 */
export default function BlockStylePanel() {
  const { state, setFeedback } = useApp()

  return (
    <section className="card">
      <CardHead title="How blocking looks" sub="What you see on a page when Luma removes an ad" />
      <div className="theme-options style-options">
        {STYLES.map((style) => {
          const Icon = style.icon
          return (
            <button
              key={style.id}
              type="button"
              className="theme-option"
              data-active={state.feedback === style.id}
              aria-pressed={state.feedback === style.id}
              onClick={() => setFeedback(style.id)}
            >
              <Icon />
              {style.label}
            </button>
          )
        })}
      </div>
      <p className="hint" style={{ marginTop: 12 }}>
        {state.feedback === 'visual'
          ? 'Each removed ad leaves a short dashed outline and a Luma badge, then collapses.'
          : 'Ads are removed before anything loads and leave nothing behind on the page.'}
      </p>
    </section>
  )
}
