import { useMemo, useState } from 'react'
import { formatDate, priorityClass } from '../lib/tasks'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function pad(value) {
  return String(value).padStart(2, '0')
}

function toIso(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function monthLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/**
 * Monthly calendar showing tasks on their due dates.
 */
export default function TaskCalendar({ tasks = [], loading = false, onOpen, emptyState }) {
  const todayIso = toIso(new Date())
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selected, setSelected] = useState(todayIso)

  const byDate = useMemo(() => {
    const map = {}
    tasks.forEach((task) => {
      if (!task.due_date) return
      map[task.due_date] = map[task.due_date] || []
      map[task.due_date].push(task)
    })
    return map
  }, [tasks])

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const start = new Date(first)
    start.setDate(first.getDate() - first.getDay())

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      const iso = toIso(date)

      return {
        date,
        iso,
        inMonth: date.getMonth() === cursor.getMonth(),
        isToday: iso === todayIso,
        tasks: byDate[iso] || [],
      }
    })
  }, [cursor, byDate, todayIso])

  const selectedTasks = byDate[selected] || []

  function shiftMonth(amount) {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1))
  }

  if (loading) {
    return (
      <div className="tm-loading">
        <span className="tm-spinner" aria-hidden="true" />
        <span>Loading calendar...</span>
      </div>
    )
  }

  if (!tasks.length) {
    return emptyState
  }

  return (
    <div className="tm-calendar">
      <div className="tm-calendar__toolbar">
        <div className="tm-calendar__nav">
          <button type="button" className="tm-icon-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
          <button type="button" className="tm-btn tm-btn--secondary tm-btn--sm" onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
            Today
          </button>
          <button type="button" className="tm-icon-btn" onClick={() => shiftMonth(1)} aria-label="Next month">
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </button>
        </div>

        <h2 className="tm-calendar__month">{monthLabel(cursor)}</h2>

        <div className="tm-calendar__legend">
          <span><i className="tm-priority-dot is-high" /> High</span>
          <span><i className="tm-priority-dot is-medium" /> Medium</span>
          <span><i className="tm-priority-dot is-low" /> Low</span>
        </div>
      </div>

      <div className="tm-calendar__weekdays">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="tm-calendar__grid">
        {cells.map((cell) => (
          <button
            type="button"
            key={cell.iso}
            className={`tm-calendar__cell${cell.inMonth ? '' : ' is-outside'}${cell.isToday ? ' is-today' : ''}${selected === cell.iso ? ' is-selected' : ''}`}
            onClick={() => setSelected(cell.iso)}
            aria-label={`${cell.iso}, ${cell.tasks.length} task${cell.tasks.length === 1 ? '' : 's'}`}
          >
            <span className="tm-calendar__date">{cell.date.getDate()}</span>

            <span className="tm-calendar__events">
              {cell.tasks.slice(0, 2).map((task) => (
                <span
                  key={task.id}
                  role="button"
                  tabIndex={0}
                  className={`tm-calendar-event is-${task.priority.toLowerCase()}`}
                  title={`${task.title} · ${task.priority} priority`}
                  onClick={(event) => {
                    event.stopPropagation()
                    onOpen?.(task)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      event.stopPropagation()
                      onOpen?.(task)
                    }
                  }}
                >
                  {task.title}
                </span>
              ))}
              {cell.tasks.length > 2 && (
                <span className="tm-calendar__more">+{cell.tasks.length - 2} more</span>
              )}
            </span>
          </button>
        ))}
      </div>

      <div className="tm-calendar__day">
        <div className="tm-calendar__day-head">
          <h3>{selected === todayIso ? `Today · ${formatDate(selected)}` : formatDate(selected)}</h3>
          <span className="tm-chip">{selectedTasks.length} task{selectedTasks.length === 1 ? '' : 's'}</span>
        </div>

        {selectedTasks.length === 0 ? (
          <p className="tm-calendar__day-empty">No tasks are due on this date.</p>
        ) : (
          <div className="tm-calendar__day-list">
            {selectedTasks.map((task) => (
              <button type="button" key={task.id} className="tm-calendar__day-item" onClick={() => onOpen?.(task)}>
                <span className={priorityClass(task.priority)}>{task.priority}</span>
                <span className="tm-calendar__day-title">{task.title}</span>
                <span className="tm-badge tm-badge-notstarted">{task.status}</span>
                <i className="bi bi-arrow-right" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
