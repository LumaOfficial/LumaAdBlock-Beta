import { RotateCcw, Sparkles } from 'lucide-react'
import { CardHead, Switch, useToast } from './ui'
import { useApp } from '../lib/useApp'
import { formatNumber } from '../lib/format'

/**
 * The protection setting for learning: how hard Luma looks for ads its lists
 * miss, and the rules it has added on its own because of it.
 */
export default function DetectionCard() {
  const { state, setDeep, clearLearned } = useApp()
  const toast = useToast()
  const learned = state.learned.length

  return (
    <div className="card">
      <CardHead title="Self-improvement" sub="When an ad slips past your lists, Luma writes the rule that stops it next time">
        <span className="badge plain">
          <Sparkles />
          {formatNumber(learned)} learned
        </span>
      </CardHead>

      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div className="grow">
          <div style={{ fontWeight: 600, fontSize: 13 }}>Look harder for ads</div>
          <p className="small muted">
            Also watches a site&rsquo;s own ad servers, not just the outside ones. More coverage — and
            the odd thing you wanted may get hidden.
          </p>
        </div>
        <Switch on={state.deep} onChange={setDeep} label="Look harder for ads" />
      </div>

      <div
        className="row"
        style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 14 }}
      >
        <p className="hint" style={{ margin: 0 }}>
          {learned
            ? `${formatNumber(learned)} rule${learned === 1 ? '' : 's'} written here. They stay on this device.`
            : 'Nothing learned yet. Rules appear here as soon as something gets past your lists.'}
        </p>
        <button
          className="btn sm ghost"
          type="button"
          disabled={!learned}
          onClick={() => {
            clearLearned()
            toast.show('Learned rules cleared')
          }}
        >
          <RotateCcw />
          Forget learned rules
        </button>
      </div>

      {toast.node}
    </div>
  )
}
