import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { formatDate, priorityClass, statusClass } from '../../lib/tasks'

/**
 * Global task search shown in the top navigation bar.
 * Searches the authenticated user's tasks by title or description.
 */
export default function GlobalSearch({ defaultValue = '' }) {
  const navigate = useNavigate()
  const wrapperRef = useRef(null)
  const [term, setTerm] = useState(defaultValue)
  const [results, setResults] = useState([])
  const [total, setTotal] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Reset the input whenever the route's search query changes.
  useEffect(() => {
    setTerm(defaultValue)
  }, [defaultValue])

  useEffect(() => {
    function onDocumentClick(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onDocumentClick)
    return () => document.removeEventListener('mousedown', onDocumentClick)
  }, [])

  // Debounced search against the real database records.
  useEffect(() => {
    const trimmed = term.trim()

    if (trimmed.length < 2) {
      setResults([])
      setTotal(0)
      setLoading(false)
      return undefined
    }

    const controller = new AbortController()
    setLoading(true)

    const timer = window.setTimeout(async () => {
      try {
        const { data } = await api.get('/search', {
          params: { q: trimmed },
          signal: controller.signal,
        })
        setResults(data.results || [])
        setTotal(data.total || 0)
        setOpen(true)
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
          setResults([])
          setTotal(0)
        }
      } finally {
        setLoading(false)
      }
    }, 260)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [term])

  function openTask(task) {
    setOpen(false)
    setTerm('')
    navigate(`/tasks/${task.id}`)
  }

  return (
    <div className="tm-global-search" ref={wrapperRef}>
      <form
        className="tm-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          setOpen(false)
          const value = term.trim()
          navigate(value ? `/tasks?search=${encodeURIComponent(value)}` : '/tasks')
        }}
      >
        <i className="bi bi-search tm-search__icon" aria-hidden="true" />
        <label className="tm-sr-only" htmlFor="globalSearch">
          Search tasks
        </label>
        <input
          id="globalSearch"
          name="globalSearch"
          type="search"
          className="tm-search__input"
          placeholder="Search tasks, notes or anything..."
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onFocus={() => {
            if (term.trim().length >= 2) setOpen(true)
          }}
          autoComplete="off"
        />
        {term && (
          <button
            type="button"
            className="tm-search__clear"
            onClick={() => {
              setTerm('')
              setResults([])
              setOpen(false)
            }}
            aria-label="Clear search"
          >
            <i className="bi bi-x-circle-fill" aria-hidden="true" />
          </button>
        )}
      </form>

      {open && (
        <div className="tm-search-results" role="listbox" aria-label="Search results">
          <div className="tm-search-results__head">
            <span>
              {loading ? 'Searching...' : `${total} result${total === 1 ? '' : 's'} for "${term.trim()}"`}
            </span>
          </div>

          {!loading && results.length === 0 && (
            <div className="tm-search-results__empty">
              <i className="bi bi-search" aria-hidden="true" />
              <span>No matching tasks. Try a different keyword.</span>
            </div>
          )}

          {results.map((task) => (
            <button
              type="button"
              key={task.id}
              className="tm-search-result"
              role="option"
              onClick={() => openTask(task)}
            >
              <span className="tm-search-result__icon" aria-hidden="true">
                <i className="bi bi-clipboard2-check" />
              </span>
              <span className="tm-search-result__body">
                <span className="tm-search-result__title">{task.title}</span>
                <span className="tm-search-result__meta">
                  {formatDate(task.due_date)}
                  {task.description ? ` · ${task.description.slice(0, 60)}` : ''}
                </span>
              </span>
              <span className="tm-search-result__badges">
                <span className={priorityClass(task.priority)}>{task.priority}</span>
                <span className={statusClass(task.status)}>{task.status}</span>
              </span>
            </button>
          ))}

          {!loading && total > results.length && (
            <button
              type="button"
              className="tm-search-results__all"
              onClick={() => {
                setOpen(false)
                navigate(`/tasks?search=${encodeURIComponent(term.trim())}`)
              }}
            >
              View all {total} results <i className="bi bi-arrow-right" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
