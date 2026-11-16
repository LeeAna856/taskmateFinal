
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '../ConfirmDialog'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'

/**
 * Centered confirmation modal shown before the user logs out.
 */
export default function LogoutDialog({ open, onClose }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    setBusy(true)

    try {
      await logout()
      onClose?.()
      toast.info('You have been logged out.')
      navigate('/login', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      busy={busy}
      tone="primary"
      icon="bi-box-arrow-right"
      title="Log out for TaskMate?"
      message="Your tasks are safely saved. You can log back in at any time to pick up where you left off."
      cancelLabel="Cancel"
      confirmLabel="Log out"
      onCancel={onClose}
      onConfirm={handleConfirm}
    />
  )
}
