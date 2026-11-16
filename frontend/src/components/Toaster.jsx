
import { useToast } from '../hooks/useToast'

export default function Toaster() {
  const toast = useToast()

  if (!toast?.message) return null

  return (
    <div className="toaster">
      <div className={`toast toast-${toast.type || 'info'}`}>
        {toast.message}
      </div>
    </div>
  )
}
