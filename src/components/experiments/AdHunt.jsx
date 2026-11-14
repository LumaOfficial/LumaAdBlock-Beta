import { useRef, useState } from 'react'
import { RotateCcw, ShieldCheck } from 'lucide-react'

const TILES = 12
const ADS = 3
const AD_LABELS = ['Sponsored', 'Banner ad', 'Promo pop-up']
const CONTENT_LABELS = ['Article', 'Photo', 'Video', 'Comment', 'Recipe', 'Review', 'Map', 'Story', 'Profile']

/** Shuffle-in-place helper so every run is a different board. */
function shuffle(items) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swap]] = [copy[swap], copy[index]]
  }
  return copy
}

function makeBoard() {
  const tiles = []
  for (let index = 0; index < TILES; index += 1) {
    tiles.push({ id: index, ad: index < ADS })
  }
  return shuffle(tiles).map((tile, position) => ({
    ...tile,
    label: tile.ad
      ? AD_LABELS[position % AD_LABELS.length]
      : CONTENT_LABELS[position % CONTENT_LABELS.length],
  }))
}

/**
 * A tiny find-the-ads game. Blocking the three ads clears the board; every
 * content tile clicked costs a miss. The time it takes is the diagnostic.
 */
export default function AdHunt({ onResult }) {
  const [board, setBoard] = useState(makeBoard)
  const [phase, setPhase] = useState('idle')
  const [found, setFound] = useState([])
  const [misses, setMisses] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const startedAt = useRef(0)

  function start() {
    setBoard(makeBoard())
    setFound([])
    setMisses(0)
    setElapsed(0)
    setPhase('playing')
    startedAt.current = performance.now()
  }

  function hit(tile) {
    if (phase !== 'playing' || found.includes(tile.id)) return
    if (!tile.ad) {
      setMisses((count) => count + 1)
      return
    }
    const next = [...found, tile.id]
    setFound(next)
    if (next.length === ADS) {
      const ms = Math.round(performance.now() - startedAt.current)
      setElapsed(ms)
      setPhase('done')
      onResult?.({ value: ms, unit: 'ms', label: 'Time to clear the board' })
    }
  }

  return (
    <div className="experiment-body">
      <div className="experiment-side">
        <p className="small muted">
          Three ads are hiding among twelve page tiles. Click every ad — content tiles cost a miss.
        </p>
        {phase === 'idle' ? (
          <button type="button" className="btn primary" onClick={start}>
            <ShieldCheck />
            Start hunting
          </button>
        ) : (
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <span className="badge plain">
              {found.length}/{ADS} ads blocked
            </span>
            <span className="badge plain">{misses} misses</span>
            {phase === 'done' ? <span className="badge good">{elapsed} ms</span> : null}
            <button type="button" className="btn sm ghost" onClick={start}>
              <RotateCcw />
              New board
            </button>
          </div>
        )}
      </div>

      <div className="hunt-grid">
        {board.map((tile) => {
          const blocked = found.includes(tile.id)
          return (
            <button
              key={tile.id}
              type="button"
              className="hunt-tile"
              data-ad={tile.ad ? 'true' : 'false'}
              data-blocked={blocked ? 'true' : 'false'}
              onClick={() => hit(tile)}
              disabled={phase !== 'playing' || blocked}
            >
              {blocked ? 'Blocked' : tile.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
