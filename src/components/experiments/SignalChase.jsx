import { useEffect, useRef, useState } from 'react'
import { Radio, RotateCcw } from 'lucide-react'

const ROUNDS = 5

/**
 * A small reaction game. Each round waits a random moment, then the pad lights
 * up; the delay between the light and the click is a round-trip time, so the
 * average doubles as a ping reading for this device.
 */
export default function SignalChase({ onResult }) {
  const [phase, setPhase] = useState('idle')
  const [rounds, setRounds] = useState([])
  const [message, setMessage] = useState('Five rounds. Click the pad the moment it lights up.')
  const shownAt = useRef(0)
  const timer = useRef(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function beginRound() {
    window.clearTimeout(timer.current)
    setPhase('waiting')
    setMessage('Hold — the signal is on its way.')
    timer.current = window.setTimeout(() => {
      shownAt.current = performance.now()
      setPhase('ready')
      setMessage('Signal! Click the pad.')
    }, 900 + Math.random() * 1600)
  }

  function start() {
    setRounds([])
    beginRound()
  }

  function hit() {
    if (phase === 'waiting') {
      window.clearTimeout(timer.current)
      setPhase('idle')
      setMessage('Too soon — that one does not count. Start again.')
      return
    }
    if (phase !== 'ready') return

    const ms = Math.round(performance.now() - shownAt.current)
    const next = [...rounds, ms]
    setRounds(next)

    if (next.length >= ROUNDS) {
      const average = Math.round(next.reduce((sum, value) => sum + value, 0) / next.length)
      setPhase('done')
      setMessage(`Five rounds done — best ${Math.min(...next)} ms, average ${average} ms.`)
      onResult?.({ value: average, unit: 'ms', label: 'Average ping' })
      return
    }
    beginRound()
  }

  const best = rounds.length ? Math.min(...rounds) : null

  return (
    <div className="experiment-body">
      <button
        type="button"
        className="signal-pad"
        data-state={phase}
        onClick={hit}
        aria-label="Signal pad"
      >
        <Radio />
        <span>
          {phase === 'ready'
            ? 'Click!'
            : phase === 'waiting'
              ? 'Wait…'
              : phase === 'done'
                ? 'Run again'
                : 'Start'}
        </span>
      </button>

      <div className="experiment-side">
        <p className="small muted">{message}</p>
        <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
          {rounds.map((ms, index) => (
            <span className="badge plain" key={index}>
              {ms} ms
            </span>
          ))}
        </div>
        {best !== null ? <p className="small muted">Fastest so far: {best} ms</p> : null}
        <button type="button" className="btn sm ghost" onClick={start}>
          <RotateCcw />
          {phase === 'idle' ? 'Start' : 'Restart'}
        </button>
      </div>
    </div>
  )
}
