
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api, { extractErrors } from '../lib/api'
import { useToast } from '../hooks/useToast'
import { PRIORITIES, STATUSES } from '../lib/tasks'
import TaskTable from '../components/TaskTable'
import TaskBoard from '../components/TaskBoard'
import TaskCalendar from '../components/TaskCalendar'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'

const SORT_OPTIONS = [
  { value: 'created_at|desc', label: 'Newest first' },
  { value: 'created_at|asc', label: 'Oldest first' },
  { value: 'due_date|asc', label: 'Due date (earliest)' },
  { value: 'due_date|desc', label: 'Due date (latest)' },
  { value: 'title|asc', label: 'Title (A-Z)' },
  { value: 'title|desc', label: 'Title (Z-A)' },
  { value: 'priority|desc', label: 'Priority (High first)' },
  { value: 'priority|asc', label: 'Priority (Low first)' },
]

const DUE_OPTIONS = [
  { value: 'all', label: 'Any due date' },
  { value: 'today', label: 'Due today' },
  { value: 'week', label: 'Due this week' },
  { value: 'overdue', label: 'Overdue only' },
  { value: 'no_due_date', label: 'No due date' },
]

const VIEWS = [
  { value: 'list', label: 'List', icon: 'bi-list-ul' },
  { value: 'board', label: 'Board', icon: 'bi-kanban' },
  { value: 'calendar', label: 'Calendar', icon: 'bi-calendar3' },
]

/**
 * Shared task screen used by All Tasks, In Progress and Completed.
 * Supports list, Kanban board and monthly calendar views.
 * The `lockedStatus` prop forces a status filter server-side.
 */
export default function TaskList({
  lockedStatus = null,
  title = 'All Tasks',
  subtitle = 'Every active task in your account.',
  emptyTitle = 'No tasks found',
  emptyText = 'Try adjusting your filters, or create a new task.',
}) {
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const [tasks, setTasks] = useState([])
  const [meta, setMeta] = useState({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const search = searchParams.get('search') || ''
  const status = lockedStatus || searchParams.get('status') || 'all'
  const priority = searchParams.get('priority') || 'all'
  const due = searchParams.get('due') || 'all'
  const sort = searchParams.get('sort') || 'created_at'
  const direction = searchParams.get('direction') || 'desc'
  const page = Number(searchParams.get('page') || 1)
  const view = VIEWS.some((option) => option.value === searchParams.get('view'))
    ? searchParams.get('view')
    : 'list'

  const [searchInput, setSearchInput] = useState(search)

  useEffect(() => {
    setSearchInput(search)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)

    const params = {
      search: search || undefined,
      status: lockedStatus || (status !== 'all' ? status : undefined),
      priority: priority !== 'all' ? priority : undefined,
      due: due !== 'all' ? due : undefined,
      sort,
      direction,
      page: view === 'list' ? page : 1,
      per_page: view === 'list' ? 10 : 200,
    }

    try {
      const { data } = await api.get('/tasks', { params })
      setTasks(data.data || [])
      setMeta(data.meta || {})
    } catch (error) {
      toast.error(extractErrors(error).general)
    } finally {
      setLoading(false)
    }
  }, [search, lockedStatus, status, priority, due, sort, direction, page, view, toast])

  useEffect(() => {
    load()
  }, [load])

  /** Update one query-string filter and reset pagination. */
  function updateParam(key, value, { resetPage = true } = {}) {
    const next = new URLSearchParams(searchParams)

    if (!value || value === 'all' || value === '') {
      next.delete(key)
    } else {
      next.set(key, value)
    }

    if (resetPage) {
      next.delete('page')
    }

    setSearchParams(next)
  }

  function handleSortChange(value) {
    const [nextSort, nextDirection] = value.split('|')
    const next = new URLSearchParams(searchParams)
    next.set('sort', nextSort)
    next.set('direction', nextDirection)
    next.delete('page')
    setSearchParams(next)
  }

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

  /** Persist a Kanban drag-and-drop status change. */
  async function handleMove(task, nextStatus) {
    if (!task || task.status === nextStatus) return

    const previous = tasks
    setTasks((current) =>
      current.map((item) => (item.id === task.id ? { ...item, status: nextStatus } : item)),
    )

    try {
      const { data } = await api.patch(`/tasks/${task.id}/status`, { status: nextStatus })
      toast.success(data.message || `Task moved to ${nextStatus}.`)
      setTasks((current) => current.map((item) => (item.id === task.id ? data.task : item)))

      // When a status is locked, a moved card may no longer belong in this view.
      if (lockedStatus && nextStatus !== lockedStatus) {
        await load()
      }
    } catch (error) {
      setTasks(previous)
      toast.error(extractErrors(error).general)
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

  const hasFilters = Boolean(search || priority !== 'all' || due !== 'all' || (!lockedStatus && status !== 'all'))

  const emptyState = (
    <div className="tm-empty">
      <span className="tm-empty__icon" aria-hidden="true">
        <i className="bi bi-inbox" />
      </span>
      <h3 className="tm-empty__title">{emptyTitle}</h3>
      <p className="tm-empty__text">{emptyText}</p>
      <button type="button" className="tm-btn tm-btn--primary" onClick={() => navigate('/tasks/new')}>
        <i className="bi bi-plus-lg" aria-hidden="true" /> Add New Task
      </button>
    </div>
  )

  return (
    <>
      <div className="tm-page-head">
        <div>
          <h1 className="tm-page-title">{title}</h1>
          <p className="tm-page-subtitle">{subtitle}</p>
        </div>

        <div className="tm-page-head__actions">
          <div className="tm-view-switch" role="tablist" aria-label="Task view">
            {VIEWS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={view === option.value}
                className={`tm-view-switch__btn${view === option.value ? ' is-active' : ''}`}
                onClick={() => updateParam('view', option.value, { resetPage: option.value === 'list' })}
              >
                <i className={`bi ${option.icon}`} aria-hidden="true" />
                <span className="tm-hide-sm">{option.label}</span>
              </button>
            ))}
          </div>

          {view === 'list' && (
            <button type="button" className="tm-btn tm-btn--primary" onClick={() => navigate('/tasks/new')}>
              <i className="bi bi-plus-lg" aria-hidden="true" /> Add New Task
            </button>
          )}
        </div>
      </div>

      <section className={`tm-panel${view === 'board' ? ' tm-panel--flush' : ''}`}>
        <form
          className="tm-toolbar"
          onSubmit={(event) => {
            event.preventDefault()
            updateParam('search', searchInput.trim())
          }}
        >
          <div className="tm-search" style={{ maxWidth: 280, minWidth: 180, flex: '1 1 200px' }}>
            <i className="bi bi-search tm-search__icon" aria-hidden="true" />
            <label className="tm-sr-only" htmlFor="taskSearch">
              Search tasks
            </label>
            <input
              id="taskSearch"
              type="search"
              className="tm-search__input"
              placeholder="Search by title or description..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          {!lockedStatus && (
            <select
              className="tm-select"
              value={status}
              onChange={(event) => updateParam('status', event.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              {STATUSES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}

          <select
            className="tm-select"
            value={priority}
            onChange={(event) => updateParam('priority', event.target.value)}
            aria-label="Filter by priority"
          >
            <option value="all">All priorities</option>
            {PRIORITIES.map((option) => (
              <option key={option} value={option}>
                {option} priority
              </option>
            ))}
          </select>

          <select
            className="tm-select"
            value={due}
            onChange={(event) => updateParam('due', event.target.value)}
            aria-label="Filter by due date"
          >
            {DUE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {view === 'list' && (
            <select
              className="tm-select"
              value={`${sort}|${direction}`}
              onChange={(event) => handleSortChange(event.target.value)}
              aria-label="Sort tasks"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}

          <div className="tm-toolbar__spacer" />

          {hasFilters && (
            <button
              type="button"
              className="tm-btn tm-btn--ghost tm-btn--sm"
              onClick={() => {
                setSearchInput('')
                setSearchParams(new URLSearchParams())
              }}
            >
              <i className="bi bi-x-circle" aria-hidden="true" /> Clear filters
            </button>
          )}
        </form>

        {view === 'list' && (
          <TaskTable
            tasks={tasks}
            loading={loading}
            busyId={busyId}
            onToggle={handleToggle}
            onOpen={(task) => navigate(`/tasks/${task.id}`)}
            onEdit={(task) => navigate(`/tasks/${task.id}/edit`)}
            onDelete={(task) => setConfirm(task)}
            emptyState={emptyState}
          />
        )}

        {view === 'board' && (
          <div className="tm-panel__body tm-panel__body--flush">
            <TaskBoard
              tasks={tasks}
              loading={loading}
              onMove={handleMove}
              onOpen={(task) => navigate(`/tasks/${task.id}`)}
              emptyState={emptyState}
            />
          </div>
        )}

        {view === 'calendar' && (
          <div className="tm-panel__body tm-panel__body--flush">
            <TaskCalendar
              tasks={tasks}
              loading={loading}
              onOpen={(task) => navigate(`/tasks/${task.id}`)}
              emptyState={emptyState}
            />
          </div>
        )}

        {view === 'list' && (
          <Pagination
            meta={meta}
            onPageChange={(nextPage) => {
              const next = new URLSearchParams(searchParams)
              next.set('page', String(nextPage))
              setSearchParams(next)
            }}
          />
        )}
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
