import { useMemo, useState } from 'react'
import Avatar from './Avatar'
import { dueLabel, formatDate, isOverdue, priorityClass } from '../lib/tasks'

const COLUMNS = [
  { status: 'Not Started', tone: 'slate', icon: 'bi-circle' },
  { status: 'In Progress', tone: 'blue', icon: 'bi-hourglass-split' },
  { status: 'Completed', tone: 'green', icon: 'bi-check2-circle' },
]

/**
 * Kanban board with drag-and-drop status changes persisted to MySQL.
 */
export default function TaskBoard({ tasks = [], loading = false, onMove, onOpen, emptyState }) {
  const [dragging, setDragging] = useState(null)
  const [over, setOver] = useState(null)
  const [movingId, setMovingId] = useState(null)

  const grouped = useMemo(() => {
    const map = { 'Not Started': [], 'In Progress': [], Completed: [] }
    tasks.forEach((task) => {
      if (map[task.status]) map[task.status].push(task)
    })
    return map
  }, [tasks])

  async function moveTask(task, status) {
    if (!task || task.status === status || movingId) return
    setMovingId(task.id)
    try {
      await onMove?.(task, status)
    } finally {
      setMovingId(null)
      setDragging(null)
      setOver(null)
    }
  }

  if (loading) {
    return (
      <div className="tm-loading">
        <span className="tm-spinner" aria-hidden="true" />
        <span>Loading board...</span>
      </div>
    )
  }

  if (!tasks.length) {
    return emptyState
  }

  return (
    <div className="tm-board">
      {COLUMNS.map((column) => {
        const columnTasks = grouped[column.status]

        return (
          <section
            key={column.status}
            className={`tm-board__column${over === column.status ? ' is-over' : ''}`}
            onDragOver={(event) => {
              event.preventDefault()
              setOver(column.status)
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setOver((current) => (current === column.status ? null : current))
              }
            }}
            onDrop={(event) => {
              event.preventDefault()
              moveTask(dragging, column.status)
            }}
          >
            <header className={`tm-board__head tm-board__head--${column.tone}`}>
              <span className="tm-board__title">
                <i className={`bi ${column.icon}`} aria-hidden="true" />
                {column.status}
              </span>
              <span className="tm-board__count">{columnTasks.length}</span>
            </header>

            <div className="tm-board__body">
              {columnTasks.length === 0 && (
                <div className="tm-board__empty">
                  <i className="bi bi-inbox" aria-hidden="true" />
                  <span>No tasks here yet</span>
                </div>
              )}

              {columnTasks.map((task) => {
                const overdue = isOverdue(task)
                const due = dueLabel(task)

                return (
                  <article
                    key={task.id}
                    className={`tm-board-card${dragging?.id === task.id ? ' is-dragging' : ''}${movingId === task.id ? ' is-busy' : ''}`}
                    draggable
                    onDragStart={(event) => {
                      setDragging(task)
                      event.dataTransfer.effectAllowed = 'move'
                      event.dataTransfer.setData('text/plain', String(task.id))
                    }}
                    onDragEnd={() => {
                      setDragging(null)
                      setOver(null)
                    }}
                  >
                    <div className="tm-board-card__top">
                      <span className={priorityClass(task.priority)}>{task.priority}</span>
                      <i className="bi bi-grip-vertical tm-board-card__grip" aria-hidden="true" />
                    </div>

                    <button type="button" className="tm-board-card__title" onClick={() => onOpen?.(task)}>
                      {task.title}
                    </button>

                    {task.description && <p className="tm-board-card__desc">{task.description}</p>}

                    <div className="tm-board-card__foot">
                      <span className={`tm-due tm-due--${overdue ? 'danger' : due.tone}`}>
                        <i className="bi bi-calendar3" aria-hidden="true" /> {formatDate(task.due_date)}
                      </span>

                      <div className="tm-avatar-stack">
                        {(task.assignees || []).slice(0, 3).map((member) => (
                          <Avatar key={member.id} user={member} size="xs" />
                        ))}
                        {(task.assignees?.length || 0) === 0 && <Avatar user={task.user} size="xs" />}
                        {(task.assignees?.length || 0) > 3 && (
                          <span className="tm-avatar tm-avatar--xs tm-avatar--more">+{task.assignees.length - 3}</span>
                        )}
                      </div>
                    </div>

                    {/* Keyboard / touch friendly alternative to dragging. */}
                    <label className="tm-board-card__move">
                      <span className="tm-sr-only">Move {task.title}</span>
                      <select
                        value={task.status}
                        onChange={(event) => moveTask(task, event.target.value)}
                        disabled={movingId === task.id}
                      >
                        {COLUMNS.map((option) => (
                          <option key={option.status} value={option.status}>
                            {option.status}
                          </option>
                        ))}
                      </select>
                    </label>
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
