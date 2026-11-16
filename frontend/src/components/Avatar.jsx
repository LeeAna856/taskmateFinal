import { useMemo } from 'react'
import { initials } from '../lib/tasks'

const TONES = ['blue', 'green', 'amber', 'purple', 'pink', 'teal']

/**
 * Deterministic avatar colour so the same person always gets the same tone.
 */
function toneFor(name = '') {
  let hash = 0
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 1000
  }
  return TONES[hash % TONES.length]
}

/**
 * Renders a person's photo when available, otherwise their initials.
 */
export default function Avatar({ user, name, size = 'md', className = '', title }) {
  const displayName = name || user?.name || ''
  const photo = user?.profile_photo_url || user?.profile_photo || null

  const style = useMemo(() => {
    if (photo) {
      return { backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    }
    return undefined
  }, [photo])

  return (
    <span
      className={`tm-avatar tm-avatar--${size} tm-avatar--${photo ? 'photo' : toneFor(displayName)} ${className}`.trim()}
      style={style}
      title={title || displayName || undefined}
      aria-label={displayName || undefined}
    >
      {!photo && initials(displayName)}
    </span>
  )
}
