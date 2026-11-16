import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api, { extractErrors } from '../lib/api'
import { useToast } from '../hooks/useToast'
import Pagination from '../components/Pagination'

const TYPES = {
  reminder: { label: 'Reminder', icon: 'bi-alarm', tone: 'amber' },
  assigned: { label: 'Assigned', icon: 'bi-person-plus', tone: 'blue' },
  comment: { label: 'Comment', icon: 'bi-chat-left-text', tone: 'green' },
  system: { label: 'System', icon: 'bi-stars', tone: 'slate' },
}

function metaFor(type) {
  return TYPES[type] || TYPES.system
}

function broadcast() {
  window.dispatchEvent(new Event('taskmate:notifications-updated'))
}

export default function Notifications() {
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const tab = searchParams.get('tab') === 'unread' ? 'unread' : 'all'
  const page = Number(searchParams.get('page') || 1)

  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({})
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [markingAll, setMarkingAll] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const { data } = await api.get('/notifications', {
        params: {
          page,
          per_page: 10,
          unread: tab === 'unread' ? 1 : undefined,
        },
      })
      setItems(data.data || [])
      setMeta(data.meta || {})
      setUnread(data.unread_count || 0)
    } catch (error) {
      toast.error(extractErrors(error).general)
    } finally {
      setLoading(false)
    }
  }, [page, tab, toast])

  useEffect(() => {
    load()
  }, [load])

  function setTab(nextTab) {
    const next = new URLSearchParams(searchParams)
    if (nextTab === 'all') next.delete('tab')
    else next.set('tab', nextTab)
    next.delete('page')
    setSearchParams(next)
  }

  function setPage(nextPage) {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(nextPage))
    setSearchParams(next)
  }

  async function markRead(notification) {
    if (notification.is_read) return

    setBusyId(notification.id)

    try {
      const { data } = await api.patch(`/notifications/${notification.id}/read`)
      setItems((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, is_read: true, read_at: data.notification?.read_at } : item)),
      )
      setUnread(data.unread_count ?? Math.max(unread - 1, 0))
      broadcast()
    } catch (error) {
      toast.error(extractErrors(error).general)
    } finally {
      setBusyId(null)
    }
  }

  async function markAllRead() {
    setMarkingAll(true)

    try {
      const { data } = await api.patch('/notifications/read-all')
      toast.success(data.message)
      setUnread(0)
      broadcast()
      await load()
    } catch (error) {
      toast.error(extractErrors(error).general)
    } finally {
      setMarkingAll(false)
    }
  }

  async function remove(notification) {
    setBusyId(notification.id)

    try {
      const { data } = await api.delete(`/notifications/${notification.id}`)
      toast.success(data.message)
      setItems((current) => current.filter((item) => item.id !== notification.id))
      setMeta((current) => ({ ...current, total: Math.max((current.total || 1) - 1, 0) }))
      if (!notification.is_read) {
        setUnread((current) => Math.max(current - 1, 0))
      }
      broadcast()
      await load()
    } catch (error) {
      toast.error(extractErrors(error).general)
    } finally {
      setBusyId(null)
    }
  }

  async function open(notification) {
    if (!notification.is_read) {
      await markRead(notification)
    }

    if (notification.task_id) {
      navigate(`/tasks/${notification.task_id}`)
    }
  }

  return (
    <>
      <div className="tm-page-head">
        <div>
          <h1 className="tm-page-title">Notifications</h1>
          <p className="tm-page-subtitle">
            {unread > 0 ? `${unread} unread notification${unread === 1 ? '' : 's'}.` : 'You are all caught up.'}
          </p>
        </div>

        <div className="tm-page-head__actions">
          <button
            type="button"
            className="tm-btn tm-btn--secondary"
            onClick={markAllRead}
            disabled={markingAll || unread === 0}
          >
            {markingAll ? <span className="tm-btn__spinner" aria-hidden="true" /> : <i className="bi bi-check2-all" aria-hidden="true" />}
            Mark all as read
          </button>
        </div>
      </div>

      <section className="tm-panel">
        <div className="tm-tabs" role="tablist" aria-label="Notification filters">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'all'}
            className={`tm-tabs__btn${tab === 'all' ? ' is-active' : ''}`}
            onClick={() => setTab('all')}
          >
            All notifications
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'unread'}
            className={`tm-tabs__btn${tab === 'unread' ? ' is-active' : ''}`}
            onClick={() => setTab('unread')}
          >
            Unread
            {unread > 0 && <span className="tm-tabs__count">{unread}</span>}
          </button>
        </div>

        {loading ? (
          <div className="tm-loading">
            <span className="tm-spinner" aria-hidden="true" />
            <span>Loading notifications...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="tm-empty">
            <span className="tm-empty__icon" aria-hidden="true">
              <i className={`bi ${tab === 'unread' ? 'bi-check2-circle' : 'bi-bell-slash'}`} />
            </span>
            <h3 className="tm-empty__title">{tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}</h3>
            <p className="tm-empty__text">
              {tab === 'unread'
                ? 'You have read everything. New reminders, assignments and comments will appear here.'
                : 'Reminders, assignments and comments on your tasks will show up here.'}
            </p>
          </div>
        ) : (
          <div className="tm-notif-page">
            {items.map((notification) => {
              const metaInfo = metaFor(notification.type)

              return (
                <article
                  key={notification.id}
                  className={`tm-notif-page__item${notification.is_read ? '' : ' is-unread'}`}
                >
                  <span className={`tm-notif__icon tm-notif__icon--${metaInfo.tone}`} aria-hidden="true">
                    <i className={`bi ${metaInfo.icon}`} />
                  </span>

                  <div className="tm-notif-page__body">
                    <div className="tm-notif-page__head">
                      <strong>{notification.title}</strong>
                      <span className={`tm-type-badge tm-type-badge--${metaInfo.tone}`}>{metaInfo.label}</span>
                      {!notification.is_read && <span className="tm-badge tm-badge-progress">New</span>}
                    </div>
                    <p>{notification.message}</p>
                    <div className="tm-notif-page__meta">
                      <span>
                        <i className="bi bi-clock" aria-hidden="true" /> {notification.time_ago}
                      </span>
                      {notification.task && (
                        <span>
                          <i className="bi bi-clipboard2-check" aria-hidden="true" /> {notification.task.title}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="tm-notif-page__actions">
                    {notification.task_id && (
                      <button
                        type="button"
                        className="tm-btn tm-btn--secondary tm-btn--sm"
                        onClick={() => open(notification)}
                        disabled={busyId === notification.id}
                      >
                        View task
                      </button>
                    )}
                    {!notification.is_read && (
                      <button
                        type="button"
                        className="tm-btn tm-btn--ghost tm-btn--sm"
                        onClick={() => markRead(notification)}
                        disabled={busyId === notification.id}
                      >
                        <i className="bi bi-check2" aria-hidden="true" /> Mark read
                      </button>
                    )}
                    <button
                      type="button"
                      className="tm-icon-btn tm-icon-btn--danger"
                      onClick={() => remove(notification)}
                      disabled={busyId === notification.id}
                      aria-label="Delete notification"
                      title="Delete notification"
                    >
                      <i className="bi bi-trash3" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        <Pagination meta={meta} onPageChange={setPage} label="notification" />
      </section>
    </>
  )
}
