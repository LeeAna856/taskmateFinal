import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { extractErrors } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { formatDate, priorityClass, statusClass } from '../lib/tasks'
import SummaryCards from '../components/SummaryCards'
import TaskTable from '../components/TaskTable'
import ConfirmDialog from '../components/ConfirmDialog'
import ProgressRing from '../components/ProgressRing'

const EMPTY_PROGRESS = {
  percent: 0,
  in_progress_percent: 0,
  not_started_percent: 0,
  completed_percent: 0,
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function todayLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Returns "3 days left", "Due today", "2 days overdue", etc. */
function remainingLabel(task) {
  if (!task?.due_date) return { text: 'No due date', tone: 'muted' }
  const due = new Date(`${task.due_date}T00:00:00`)
  const today = new Date(new Date().toDateString())
  const diff = Math.round((due - today) / 86400000)

  if (task.status === 'Completed') return { text: 'Completed', tone: 'muted' }
  if (diff < 0) return { text: `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} overdue`, tone: 'danger' }
  if (diff === 0) return { text: 'Due today', tone: 'warning' }
  if (diff === 1) return { text: 'Due tomorrow', tone: 'warning' }
  return { text: `${diff} days left`, tone: 'muted' }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()

  const [stats, setStats] = useState({})
  const [progress, setProgress] = useState(EMPTY_PROGRESS)
  const [upcoming, setUpcoming] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const [dashboard, list] = await Promise.all([
        api.get('/dashboard'),
        api.get('/tasks', { params: { per_page: 6, sort: 'created_at', direction: 'desc' } }),
      ])

      setStats(dashboard.data.stats || {})
      setProgress({ ...EMPTY_PROGRESS, ...(dashboard.data.progress || {}) })
      setUpcoming(dashboard.data.upcoming || [])
      setTasks(list.data.data || [])
    } catch (error) {
      toast.error(extractErrors(error).general)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  async function handleToggle(task) {
    setBusyId(task.id)

    try {
      const { data } = await api.patch(`/tasks/${task.id}/toggle`)
      toast.success(data.message)
      await load()
    } catch (error) {
      toast.error(extractErrors(error).general)
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete() {
    if (!confirm) return

    setDeleting(true)

    try {
      const { data } = await api.delete(`/tasks/${confirm.id}`)
      toast.success(data.message)
      setConfirm(null)
      await load()
    } catch (error) {
      toast.error(extractErrors(error).general)
    } finally {
      setDeleting(false)
    }
  }

  const firstName = (user?.name || 'there').split(' ')[0]
  const progressRows = [
    { key: 'in_progress', label: 'In Progress', tone: 'blue', count: stats.in_progress ?? 0, percent: progress.in_progress_percent ?? 0 },
    { key: 'not_started', label: 'Not Started', tone: 'slate', count: stats.not_started ?? 0, percent: progress.not_started_percent ?? 0 },
    { key: 'completed', label: 'Completed', tone: 'green', count: stats.completed ?? 0, percent: progress.completed_percent ?? 0 },
  ]

  return (
    <>
      <div className="tm-page-head tm-dash-head">
        <div>
          <h1 className="tm-page-title">Dashboard</h1>
          <p className="tm-page-subtitle">
            {greeting()}, <strong>{firstName}</strong> — here is what your day looks like.
          </p>
        </div>
        <span className="tm-dash-head__date">
          <i className="bi bi-calendar3" aria-hidden="true" />
          {todayLabel()}
        </span>
      </div>

      <SummaryCards stats={stats} />

      <div className="tm-dash-grid">
        <section className="tm-panel tm-progress-panel">
          <div className="tm-panel__head">
            <div>
              <h2 className="tm-panel__title">Task progress</h2>
              <p className="tm-panel__sub">A live snapshot of everything on your plate.</p>
            </div>
            <span className="tm-chip">{stats.all ?? 0} total</span>
          </div>

          <div className="tm-progress-panel__body">
            <ProgressRing percent={progress.percent} />

            <div className="tm-progress-panel__detail">
              <div className="tm-progress-panel__label">
                <span>Overall completion</span>
                <strong>{progress.percent ?? 0}%</strong>
              </div>
              <div className="tm-progress-bar" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${Math.min(progress.percent ?? 0, 100)}%` }} />
              </div>

              <div className="tm-progress-rows">
                {progressRows.map((row) => (
                  <div className="tm-progress-row" key={row.key}>
                    <span className={`tm-progress-row__dot tm-progress-row__dot--${row.tone}`} aria-hidden="true" />
                    <span className="tm-progress-row__label">{row.label}</span>
                    <span className="tm-progress-row__count">{row.count}</span>
                    <span className="tm-progress-row__percent">{row.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="tm-panel">
          <div className="tm-panel__head">
            <div>
              <h2 className="tm-panel__title">Upcoming tasks</h2>
              <p className="tm-panel__sub">Deadlines coming up next.</p>
            </div>
            <button type="button" className="tm-link-btn" onClick={() => navigate('/tasks?due=upcoming')}>
              View all
            </button>
          </div>

          <div className="tm-panel__body">
            {loading ? (
              <div className="tm-loading" style={{ padding: '26px 0' }}>
                <span className="tm-spinner" aria-hidden="true" />
              </div>
            ) : upcoming.length === 0 ? (
              <div className="tm-mini-empty">
                <i className="bi bi-calendar-check" aria-hidden="true" />
                <p>Nothing scheduled. Add a due date to see upcoming work here.</p>
              </div>
            ) : (
              <div className="tm-upcoming-list">
                {upcoming.slice(0, 4).map((task) => {
                  const remaining = remainingLabel(task)

                  return (
                    <button
                      type="button"
                      key={task.id}
                      className="tm-upcoming-card"
                      onClick={() => navigate(`/tasks/${task.id}`)}
                    >
                      <div className="tm-upcoming-card__top">
                        <span className={priorityClass(task.priority)}>{task.priority}</span>
                        <span className={`tm-due tm-due--${remaining.tone}`}>{remaining.text}</span>
                      </div>
                      <span className="tm-upcoming-card__title">{task.title}</span>
                      {task.description && <span className="tm-upcoming-card__desc">{task.description}</span>}
                      <div className="tm-upcoming-card__foot">
                        <span className="tm-upcoming-card__date">
                          <i className="bi bi-calendar-event" aria-hidden="true" /> {formatDate(task.due_date)}
                        </span>
                        <span className={statusClass(task.status)}>{task.status}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="tm-panel tm-dash-tasks">
        <div className="tm-panel__head">
          <div>
            <h2 className="tm-panel__title">Your tasks</h2>
            <p className="tm-panel__sub">Your most recently created tasks.</p>
          </div>
          <button type="button" className="tm-btn tm-btn--ghost tm-btn--sm" onClick={() => navigate('/tasks')}>
            View all tasks <i className="bi bi-arrow-right" aria-hidden="true" />
          </button>
        </div>

        <TaskTable
          tasks={tasks}
          loading={loading}
          busyId={busyId}
          onToggle={handleToggle}
          onOpen={(task) => navigate(`/tasks/${task.id}`)}
          onEdit={(task) => navigate(`/tasks/${task.id}/edit`)}
          onDelete={(task) => setConfirm(task)}
          emptyState={
            <div className="tm-empty">
              <span className="tm-empty__icon" aria-hidden="true">
                <i className="bi bi-clipboard2-check" />
              </span>
              <h3 className="tm-empty__title">No tasks yet</h3>
              <p className="tm-empty__text">You have not created any tasks. Add your first task to get started.</p>
              <button type="button" className="tm-btn tm-btn--primary" onClick={() => navigate('/tasks/new')}>
                <i className="bi bi-plus-lg" aria-hidden="true" /> Add New Task
              </button>
            </div>
          }
        />
      </section>

      <ConfirmDialog
        open={Boolean(confirm)}
        busy={deleting}
        title="Move task to trash?"
        message={confirm ? `"${confirm.title}" will be moved to the trash. You can restore it at any time.` : ''}
        confirmLabel="Move to Trash"
        onCancel={() => setConfirm(null)}
        onConfirm={handleDelete}
      />
    </>
  )
}
