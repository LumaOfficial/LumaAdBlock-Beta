import { Clock, Moon } from 'lucide-react'
import { CardHead, Switch } from '../ui'
import { useApp } from '../../lib/store'
import { clockLabel, scheduleLabel } from '../../lib/schedule'

function TimeField({ id, label, value, onChange }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="input"
        type="time"
        value={value}
        onChange={(event) => {
          // Empty while the person is editing: keep the last good value.
          if (/^\d{2}:\d{2}$/.test(event.target.value)) onChange(event.target.value)
        }}
      />
    </div>
  )
}

export default function ScheduleCard() {
  const { state, setSchedule, pausedBySchedule } = useApp()
  const schedule = state.schedule

  function update(patch) {
    setSchedule({ ...schedule, ...patch })
  }

  return (
    <div className="card">
      <CardHead
        title="Quiet hours"
        sub="Let protection step aside on a schedule, every day"
      >
        <Switch
          on={schedule.enabled}
          onChange={(enabled) => update({ enabled })}
          label="Quiet hours"
        />
      </CardHead>

      <div className="schedule-grid">
        <TimeField
          id="quiet-from"
          label="Pause at"
          value={schedule.from}
          onChange={(from) => update({ from })}
        />
        <TimeField
          id="quiet-to"
          label="Resume at"
          value={schedule.to}
          onChange={(to) => update({ to })}
        />
      </div>

      <div className="schedule-state" data-on={schedule.enabled ? 'true' : 'false'}>
        {schedule.enabled ? (
          pausedBySchedule ? (
            <>
              <Moon width={14} height={14} />
              <span>
                Quiet hours are on right now — protection resumes at{' '}
                <strong>{clockLabel(schedule.to)}</strong>.
              </span>
            </>
          ) : (
            <>
              <Clock width={14} height={14} />
              <span>
                Protection is active. It pauses at <strong>{clockLabel(schedule.from)}</strong> and
                resumes at <strong>{clockLabel(schedule.to)}</strong>.
              </span>
            </>
          )
        ) : (
          <>
            <Clock width={14} height={14} />
            <span>Off — protection runs around the clock ({scheduleLabel(schedule)} is saved).</span>
          </>
        )}
      </div>

      <p className="footer-note">
        Quiet hours only pause blocking; your lists, rules and trusted sites stay exactly as they are.
      </p>
    </div>
  )
}
