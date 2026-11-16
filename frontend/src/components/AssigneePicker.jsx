import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../lib/api'
import Avatar from './Avatar'

/**
 * Searchable multi-select for assigning teammates to a task.
 *
 * `value` is an array of user ids. `seed` is an optional array of user objects
 * (e.g. the task's current assignees) used to show names before the member
 * directory has loaded.
 */
export default function AssigneePicker({ value = [], onChange, seed = [], error }) {
  const wrapperRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const selectedIds = useMemo(() => value.map(Number), [value])

  // Directory results merged with any seeded (already assigned) people.
  const directory = useMemo(() => {
    const map = new Map()
    ;[...seed, ...members].forEach((member) => {
      if (member?.id) map.set(Number(member.id), member)
    })
    return Array.from(map.values())
  }, [members, seed])

  const selectedMembers = useMemo(
    () => selectedIds.map((id) => directory.find((member) => Number(member.id) === id)).filter(Boolean),
    [directory, selectedIds],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const list = directory.filter((member) => !selectedIds.includes(Number(member.id)))

    if (!term) return list

    return list.filter(
      (member) =>
        member.name?.toLowerCase().includes(term) || member.email?.toLowerCase().includes(term),
    )
  }, [directory, search, selectedIds])

  useEffect(() => {
    function onDocumentClick(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onDocumentClick)
    return () => document.removeEventListener('mousedown', onDocumentClick)
  }, [])

  async function loadMembers() {
    if (loaded || loading) return

    setLoading(true)
    try {
      const { data } = await api.get('/members')
      setMembers(data.data || [])
    } catch {
      setMembers([])
    } finally {
      setLoading(false)
      setLoaded(true)
    }
  }

  function toggleOpen() {
    setOpen((current) => {
      if (!current) loadMembers()
      return !current
    })
  }

  function addMember(member) {
    const id = Number(member.id)
    if (!selectedIds.includes(id)) {
      onChange?.([...selectedIds, id])
    }
    setSearch('')
  }

  function removeMember(id) {
    onChange?.(selectedIds.filter((current) => current !== Number(id)))
  }

  return (
    <div className={`tm-assignee${error ? ' has-error' : ''}`} ref={wrapperRef}>
      <label className="tm-label" htmlFor="assigneeTrigger">
        Assign to
      </label>

      <div className="tm-assignee__control">
        {selectedMembers.map((member) => (
          <span className="tm-assignee__chip" key={member.id}>
            <Avatar user={member} size="xs" />
            <span>{member.name}</span>
            <button
              type="button"
              onClick={() => removeMember(member.id)}
              aria-label={`Remove ${member.name}`}
            >
              <i className="bi bi-x" aria-hidden="true" />
            </button>
          </span>
        ))}

        <button
          type="button"
          id="assigneeTrigger"
          className="tm-assignee__trigger"
          onClick={toggleOpen}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <i className="bi bi-person-plus" aria-hidden="true" />
          {selectedMembers.length === 0 ? 'Add teammates' : 'Add another'}
        </button>
      </div>

      {open && (
        <div className="tm-assignee__panel">
          <div className="tm-assignee__search">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search people by name or email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              autoFocus
            />
          </div>

          <div className="tm-assignee__list" role="listbox" aria-multiselectable="true">
            {loading && (
              <div className="tm-assignee__empty">
                <span className="tm-spinner" aria-hidden="true" /> Loading people...
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="tm-assignee__empty">
                <i className="bi bi-people" aria-hidden="true" />
                {directory.length === 0 ? 'No other team members yet.' : 'No matching people.'}
              </div>
            )}

            {!loading &&
              filtered.map((member) => (
                <button
                  type="button"
                  key={member.id}
                  className="tm-assignee__option"
                  role="option"
                  aria-selected="false"
                  onClick={() => addMember(member)}
                >
                  <Avatar user={member} size="sm" />
                  <span className="tm-assignee__meta">
                    <strong>{member.name}</strong>
                    <span>{member.email}</span>
                  </span>
                  <i className="bi bi-plus-lg" aria-hidden="true" />
                </button>
              ))}
          </div>
        </div>
      )}

      {error ? (
        <span className="tm-error" role="alert">
          <i className="bi bi-exclamation-circle" aria-hidden="true" />
          {error}
        </span>
      ) : (
        <span className="tm-hint">Optional. Assigned teammates are notified and can comment.</span>
      )}
    </div>
  )
}
