import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import Sidebar from './Sidebar'
import GlobalSearch from './GlobalSearch'
import NotificationBell from './NotificationBell'
import LogoutDialog from './LogoutDialog'

/**
 * The authenticated application shell: sidebar + topbar + routed content.
 */
export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [counts, setCounts] = useState({})
  const searchParam = new URLSearchParams(location.search).get('search') || ''

  // Keep the sidebar counters in sync with the database.
  useEffect(() => {
    let cancelled = false

    async function loadCounts() {
      try {
        const { data } = await api.get('/dashboard')
        if (!cancelled) {
          setCounts(data.stats || {})
        }
      } catch {
        // Counters are decorative — ignore transient failures.
      }
    }

    loadCounts()

    return () => {
      cancelled = true
    }
  }, [location.pathname, location.search])

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="tm-app">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        counts={counts}
        onLogout={() => setLogoutOpen(true)}
      />

      <div className="tm-main">
        <header className="tm-topbar">
          <button
            type="button"
            className="tm-icon-btn tm-mobile-only"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
            aria-controls="tm-sidebar"
            aria-expanded={sidebarOpen}
          >
            <i className="bi bi-list" aria-hidden="true" />
          </button>

          <GlobalSearch defaultValue={searchParam} />

          <div className="tm-topbar__spacer" />

          <NotificationBell />

          <button
            type="button"
            className="tm-btn tm-btn--primary tm-topbar__add"
            onClick={() => navigate('/tasks/new')}
          >
            <i className="bi bi-plus-lg" aria-hidden="true" />
            <span className="tm-hide-sm">Add New Task</span>
          </button>
        </header>

        <main className="tm-content">
          <Outlet />
        </main>
      </div>

      <LogoutDialog open={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </div>
  )
}
