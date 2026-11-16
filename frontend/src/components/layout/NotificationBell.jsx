import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'

const TYPE_META = {
  reminder: { label: 'Reminder', icon: 'bi-alarm', tone: 'amber' },
  assigned: { label: 'Assigned', icon: 'bi-person-plus', tone: 'blue' },
  comment: { label: 'Comment', icon: 'bi-chat-left-text', tone: 'green' },
  system: { label: 'System', icon: 'bi-stars', tone: 'slate' },
}

function typeMeta(type) {
  return TYPE_META[type] || TYPE_META.system
}

/**
 * Topbar notification bell with unread count and a dropdown preview.
 */
export default function NotificationBell() {
  const navigate = useNavigate()
  const wrapperRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)

  const loadCount = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/unread-count')
      setUnread(data.unread_count || 0)
    } catch {
      // The bell is non-critical; ignore transient failures.
    }
  }, [])

  const loadLatest = useCallback(async () => {
    setLoading(true)

    try {
      const { data } = await api.get('/notifications', { params: { per_page: 8 } })
      setItems(data.data || [])
      setUnread(data.unread_count || 0)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCount()
    const timer = window.setInterval(loadCount, 45000)

    // Keep the badge in sync when the notifications page changes state.
    window.addEventListener('taskmate:notifications-updated', loadCount)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('taskmate:notifications-updated', loadCount)
    }
  }, [loadCount])

  useEffect(() => {
    function onDocumentClick(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onDocumentClick)
    return () => document.removeEventListener('mousedown', onDocumentClick)
  }, [])

  async function toggle() {
    const next = !open
    setOpen(next)

    if (next) {
      await loadLatest()
    }
  }

  async function markAll() {
    try {
      await api.patch('/notifications/read-all')
      setUnread(0)
      setItems((current) => current.map((item) => ({ ...item, is_read: true, read_at: new Date().toISOString() })))
    } catch {
      // Silently ignore.
    }
  }

  async function openNotification(notification) {
    if (!notification.is_read) {
      try {
        const { data } = await api.patch(`/notifications/${notification.id}/read`)
        setUnread(data.unread_count ?? Math.max(unread - 1, 0))
        setItems((current) =>
          current.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)),
        )
      } catch {
        // Continue to the task even if marking as read fails.
      }
    }

    setOpen(false)

    if (notification.task_id) {
      navigate(`/tasks/${notification.task_id}`)
    } else {
      navigate('/notifications')
    }
  }

  return (
    <div className="tm-bell" ref={wrapperRef}>
      <button
        type="button"
        className={`tm-icon-btn tm-bell__button${open ? ' is-open' : ''}`}
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <i className="bi bi-bell" aria-hidden="true" />
        {unread > 0 && <span className="tm-bell__badge">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && (
        <div className="tm-notif-panel" role="menu" aria-label="Notifications">
          <div className="tm-notif-panel__head">
            <div>
              <h3>Notifications</h3>
              <p>{unread > 0 ? `${unread} unread` : 'You are all caught up'}</p>
            </div>
            <button type="button" className="tm-link-btn" onClick={markAll} disabled={unread === 0}>
              Mark all as read
            </button>
          </div>

          <div className="tm-notif-panel__body">
            {loading ? (
              <div className="tm-loading" style={{ padding: '26px 10px' }}>
                <span className="tm-spinner" aria-hidden="true" />
              </div>
            ) : items.length === 0 ? (
              <div className="tm-notif-empty">
                <i className="bi bi-bell-slash" aria-hidden="true" />
                <span>No notifications yet.</span>
              </div>
            ) : (
              items.map((notification) => {
                const meta = typeMeta(notification.type)

                return (
                  <button
                    type="button"
                    key={notification.id}
                    className={`tm-notif${notification.is_read ? '' : ' is-unread'}`}
                    role="menuitem"
                    onClick={() => openNotification(notification)}
                  >
                    <span className={`tm-notif__icon tm-notif__icon--${meta.tone}`} aria-hidden="true">
                      <i className={`bi ${meta.icon}`} />
                    </span>
                    <span className="tm-notif__body">
                      <span className="tm-notif__title">{notification.title}</span>
                      <span className="tm-notif__message">{notification.message}</span>
                      <span className="tm-notif__meta">
                        <span className={`tm-type-badge tm-type-badge--${meta.tone}`}>{meta.label}</span>
                        <span>{notification.time_ago}</span>
                      </span>
                    </span>
                    {!notification.is_read && <span className="tm-notif__dot" aria-hidden="true" />}
                  </button>
                )
              })
            )}
          </div>

          <button
            type="button"
            className="tm-notif-panel__foot"
            onClick={() => {
              setOpen(false)
              navigate('/notifications')
            }}
          >
            View all notifications <i className="bi bi-arrow-right" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
