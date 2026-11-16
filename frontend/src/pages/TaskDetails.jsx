import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api, { extractErrors } from '../lib/api'
import { useToast } from '../hooks/useToast'
import { dueLabel, formatDate, isOverdue, priorityClass, STATUSES } from '../lib/tasks'
import Avatar from '../components/Avatar'
import ConfirmDialog from '../components/ConfirmDialog'

export default function TaskDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [comment, setComment] = useState('')
  const [posting, setPosting] = useState(false)
  const [commentError, setCommentError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const { data } = await api.get(`/tasks/${id}`)
      setTask(data.task)
      setLoadError(null)
    } catch (error) {
      setLoadError(extractErrors(error).general)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function changeStatus(nextStatus) {
    if (!task || nextStatus === task.status) return

    setBusy(true)
    try {
      const { data } = await api.patch(`/tasks/${task.id}/status`, { status: nextStatus })
      setTask((current) => ({ ...current, ...data.task }))
      toast.success(data.message)
    } catch (error) {
      toast.error(extractErrors(error).general)
    } finally {
      setBusy(false)
    }
  }

  async function toggleComplete() {
    setBusy(true)
    try {
      const { data } = await api.patch(`/tasks/${task.id}/toggle`)
      setTask((current) => ({ ...current, ...data.task }))
      toast.success(data.message)
    } catch (error) {
      toast.error(extractErrors(error).general)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)

    try {
      const { data } = await api.delete(`/tasks/${task.id}`)
      toast.success(data.message)
      navigate('/tasks')
    } catch (error) {
      toast.error(extractErrors(error).general)
      setDeleting(false)
    }
  }

  async function postComment(event) {
    event.preventDefault()
    const body = comment.trim()

    if (!body) {
      setCommentError('Write a comment before posting.')
      return
    }

    setPosting(true)
    setCommentError(null)

    try {
      const { data } = await api.post(`/tasks/${task.id}/comments`, { body })
      setTask((current) => ({
        ...current,
        comments: [...(current.comments || []), data.comment],
      }))
      setComment('')
      toast.success('Comment posted.')
    } catch (error) {
      const errors = extractErrors(error)
      setCommentError(errors.body || errors.general)
    } finally {
      setPosting(false)
    }
  }

  if (loading) {
    return (
      <div className="tm-loading">
        <span className="tm-spinner" aria-hidden="true" />
        <span>Loading task...</span>
      </div>
    )
  }

  if (loadError || !task) {
    return (
      <section className="tm-form-card">
        <div className="tm-form-card__body">
          <div className="tm-alert tm-alert--error" role="alert">
            <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
            <span>{loadError || 'This task could not be found.'}</span>
          </div>
          <button type="button" className="tm-btn tm-btn--secondary" onClick={() => navigate('/tasks')}>
            <i className="bi bi-arrow-left" aria-hidden="true" /> Back to tasks
          </button>
        </div>
      </section>
    )
  }

  const overdue = isOverdue(task)
  const due = dueLabel(task)
  const comments = task.comments || []

  return (
    <>
      <button type="button" className="tm-back-link" onClick={() => navigate('/tasks')}>
        <i className="bi bi-arrow-left" aria-hidden="true" /> Back to tasks
      </button>

      <div className="tm-page-head tm-details-head">
        <div className="tm-details-head__title">
          <span className={`tm-details-head__check${task.status === 'Completed' ? ' is-done' : ''}`} aria-hidden="true">
            <i className={`bi ${task.status === 'Completed' ? 'bi-check2' : 'bi-clipboard2'}`} />
          </span>
          <div>
            <h1 className="tm-page-title">{task.title}</h1>
            <p className="tm-page-subtitle">
              Created {task.created_at ? new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
            </p>
          </div>
        </div>

        <div className="tm-page-head__actions">
          <button type="button" className="tm-btn tm-btn--secondary" onClick={toggleComplete} disabled={busy}>
            <i className={`bi ${task.status === 'Completed' ? 'bi-arrow-counterclockwise' : 'bi-check2-circle'}`} aria-hidden="true" />
            {task.status === 'Completed' ? 'Reopen' : 'Mark complete'}
          </button>
          <button type="button" className="tm-btn tm-btn--secondary" onClick={() => navigate(`/tasks/${task.id}/edit`)}>
            <i className="bi bi-pencil" aria-hidden="true" /> Edit
          </button>
          <button type="button" className="tm-btn tm-btn--danger-soft" onClick={() => setConfirm(true)}>
            <i className="bi bi-trash3" aria-hidden="true" /> Delete
          </button>
        </div>
      </div>

      <div className="tm-two-col tm-details-grid">
        <div className="tm-stack">
          <section className="tm-panel">
            <div className="tm-panel__head">
              <div>
                <h2 className="tm-panel__title">Description</h2>
                <p className="tm-panel__sub">Everything you need to know about this task.</p>
              </div>
            </div>
            <div className="tm-panel__body">
              {task.description ? (
                <p className="tm-details-desc">{task.description}</p>
              ) : (
                <p className="tm-details-desc is-muted">No description was added for this task.</p>
              )}
            </div>
          </section>

          <section className="tm-panel">
            <div className="tm-panel__head">
              <div>
                <h2 className="tm-panel__title">Comments</h2>
                <p className="tm-panel__sub">
                  {comments.length} comment{comments.length === 1 ? '' : 's'} · assigned teammates are notified.
                </p>
              </div>
            </div>

            <div className="tm-panel__body">
              {comments.length === 0 ? (
                <div className="tm-mini-empty">
                  <i className="bi bi-chat-left-text" aria-hidden="true" />
                  <p>No comments yet. Start the conversation below.</p>
                </div>
              ) : (
                <div className="tm-comments">
                  {comments.map((item) => (
                    <article className="tm-comment" key={item.id}>
                      <Avatar user={item.user} size="sm" />
                      <div className="tm-comment__body">
                        <div className="tm-comment__head">
                          <strong>{item.user?.name}</strong>
                          <span>{item.time_ago}</span>
                        </div>
                        <p>{item.body}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <form className="tm-comment-form" onSubmit={postComment}>
                <label className="tm-sr-only" htmlFor="commentBody">
                  Write a comment
                </label>
                <textarea
                  id="commentBody"
                  className={`tm-textarea${commentError ? ' has-error' : ''}`}
                  rows={3}
                  placeholder="Write a comment..."
                  value={comment}
                  onChange={(event) => {
                    setComment(event.target.value)
                    setCommentError(null)
                  }}
                  maxLength={2000}
                />
                {commentError && (
                  <span className="tm-error" role="alert">
                    <i className="bi bi-exclamation-circle" aria-hidden="true" />
                    {commentError}
                  </span>
                )}
                <div className="tm-comment-form__foot">
                  <span className="tm-hint">{comment.length}/2000</span>
                  <button type="submit" className="tm-btn tm-btn--primary tm-btn--sm" disabled={posting}>
                    {posting && <span className="tm-btn__spinner" aria-hidden="true" />}
                    {posting ? 'Posting...' : 'Post comment'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>

        <aside className="tm-stack">
          <section className="tm-panel">
            <div className="tm-panel__head">
              <h2 className="tm-panel__title">Details</h2>
            </div>
            <div className="tm-panel__body tm-stack">
              <div className="tm-detail-row">
                <span className="tm-detail-row__label">Status</span>
                <select
                  className="tm-select tm-select--sm"
                  value={task.status}
                  onChange={(event) => changeStatus(event.target.value)}
                  disabled={busy}
                  aria-label="Task status"
                >
                  {STATUSES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="tm-detail-row">
                <span className="tm-detail-row__label">Priority</span>
                <span className={priorityClass(task.priority)}>{task.priority}</span>
              </div>

              <div className="tm-detail-row">
                <span className="tm-detail-row__label">Due date</span>
                <span className={`tm-due tm-due--${overdue ? 'danger' : due.tone}`}>
                  {overdue && <i className="bi bi-exclamation-circle" aria-hidden="true" />}
                  {task.due_date ? formatDate(task.due_date) : 'No due date'}
                </span>
              </div>

              {task.due_date && (
                <div className={`tm-details-due-banner${overdue ? ' is-overdue' : ''}`}>
                  <i className={`bi ${overdue ? 'bi-exclamation-triangle' : 'bi-clock-history'}`} aria-hidden="true" />
                  <span>{due.text}</span>
                </div>
              )}

              <div className="tm-detail-row">
                <span className="tm-detail-row__label">Owner</span>
                <span className="tm-detail-person">
                  <Avatar user={task.user} size="xs" />
                  {task.user?.name}
                </span>
              </div>

              <div className="tm-detail-divider" />

              <div>
                <span className="tm-detail-row__label">Assignees</span>
                {(task.assignees || []).length === 0 ? (
                  <p className="tm-hint" style={{ marginTop: 6 }}>
                    No one has been assigned yet.{' '}
                    <button type="button" className="tm-link-btn" onClick={() => navigate(`/tasks/${task.id}/edit`)}>
                      Assign teammates
                    </button>
                  </p>
                ) : (
                  <div className="tm-assignee-list">
                    {task.assignees.map((member) => (
                      <span className="tm-assignee-list__item" key={member.id}>
                        <Avatar user={member} size="xs" />
                        <span>
                          <strong>{member.name}</strong>
                          <span>{member.email}</span>
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="tm-panel">
            <div className="tm-panel__head">
              <h2 className="tm-panel__title">Quick actions</h2>
            </div>
            <div className="tm-panel__body tm-stack">
              <button
                type="button"
                className="tm-btn tm-btn--secondary tm-btn--block"
                onClick={() => navigate('/tasks/new')}
              >
                <i className="bi bi-plus-lg" aria-hidden="true" /> Add New Task
              </button>
              <button
                type="button"
                className="tm-btn tm-btn--ghost tm-btn--block"
                onClick={() => navigate('/tasks')}
              >
                <i className="bi bi-list-ul" aria-hidden="true" /> All tasks
              </button>
            </div>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={confirm}
        busy={deleting}
        title="Move task to trash?"
        message={`"${task.title}" will be moved to the trash. You can restore it at any time.`}
        confirmLabel="Move to Trash"
        onCancel={() => setConfirm(false)}
        onConfirm={handleDelete}
      />
    </>
  )
}
