import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { extractErrors } from '../lib/api'
import { TextInput } from '../components/FormFields'
import Avatar from '../components/Avatar'
import LogoutDialog from '../components/layout/LogoutDialog'

export default function Profile() {
  const { user, updateProfile, uploadPhoto, deletePhoto, changePassword } = useAuth()
  const toast = useToast()
  const location = useLocation()
  const fileRef = useRef(null)
  const passwordRef = useRef(null)

  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' })
  const [profileErrors, setProfileErrors] = useState({})
  const [savingProfile, setSavingProfile] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)

  const [passwords, setPasswords] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [passwordErrors, setPasswordErrors] = useState({})
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    if (location.hash === '#change-password') {
      passwordRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [location.hash])

  function updateProfileField(field, value) {
    setProfile((current) => ({ ...current, [field]: value }))
    setProfileErrors((current) => ({ ...current, [field]: undefined }))
  }

  function updatePasswordField(field, value) {
    setPasswords((current) => ({ ...current, [field]: value }))
    setPasswordErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function handleProfileSubmit(event) {
    event.preventDefault()
    setSavingProfile(true)
    setProfileErrors({})

    try {
      const data = await updateProfile({
        name: profile.name.trim(),
        email: profile.email.trim(),
      })
      toast.success(data.message)
    } catch (error) {
      setProfileErrors(extractErrors(error))
    } finally {
      setSavingProfile(false)
    }
  }

  async function handlePhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setPhotoBusy(true)

    try {
      const data = await uploadPhoto(file)
      toast.success(data.message)
    } catch (error) {
      toast.error(extractErrors(error).photo || extractErrors(error).general)
    } finally {
      setPhotoBusy(false)
    }
  }

  async function handleRemovePhoto() {
    setPhotoBusy(true)

    try {
      const data = await deletePhoto()
      toast.success(data.message)
    } catch (error) {
      toast.error(extractErrors(error).general)
    } finally {
      setPhotoBusy(false)
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    setSavingPassword(true)
    setPasswordErrors({})

    try {
      const data = await changePassword({
        current_password: passwords.current_password,
        password: passwords.password,
        password_confirmation: passwords.password_confirmation,
      })
      toast.success(data.message)
      setPasswords({ current_password: '', password: '', password_confirmation: '' })
    } catch (error) {
      setPasswordErrors(extractErrors(error))
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <>
      <div className="tm-page-head">
        <div>
          <h1 className="tm-page-title">Account settings</h1>
          <p className="tm-page-subtitle">Manage your profile details, photo and password.</p>
        </div>
        <button type="button" className="tm-btn tm-btn--secondary" onClick={() => setLogoutOpen(true)}>
          <i className="bi bi-box-arrow-right" aria-hidden="true" /> Log out
        </button>
      </div>

      <div className="tm-two-col">
        <div className="tm-stack">
          <section className="tm-form-card tm-form-card--full" id="edit-profile">
            <div className="tm-form-card__head">
              <h2>Profile information</h2>
              <p>Update the name and email address on your account.</p>
            </div>

            <form onSubmit={handleProfileSubmit} noValidate>
              <div className="tm-form-card__body">
                {profileErrors.general && (
                  <div className="tm-alert tm-alert--error" role="alert">
                    <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
                    <span>{profileErrors.general}</span>
                  </div>
                )}

                <div className="tm-form">
                  <TextInput
                    label="Full name"
                    name="name"
                    required
                    value={profile.name}
                    onChange={(event) => updateProfileField('name', event.target.value)}
                    error={profileErrors.name}
                  />

                  <TextInput
                    label="Email address"
                    name="email"
                    type="email"
                    required
                    value={profile.email}
                    onChange={(event) => updateProfileField('email', event.target.value)}
                    error={profileErrors.email}
                  />
                </div>
              </div>

              <div className="tm-form-card__foot">
                <button type="submit" className="tm-btn tm-btn--primary" disabled={savingProfile}>
                  {savingProfile && <span className="tm-btn__spinner" aria-hidden="true" />}
                  {savingProfile ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </section>

          <section className="tm-form-card tm-form-card--full" id="change-password" ref={passwordRef}>
            <div className="tm-form-card__head">
              <h2>Change password</h2>
              <p>Use at least 8 characters with letters and numbers.</p>
            </div>

            <form onSubmit={handlePasswordSubmit} noValidate>
              <div className="tm-form-card__body">
                {passwordErrors.general && (
                  <div className="tm-alert tm-alert--error" role="alert">
                    <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
                    <span>{passwordErrors.general}</span>
                  </div>
                )}

                <div className="tm-form">
                  <TextInput
                    label="Current password"
                    name="current_password"
                    type="password"
                    required
                    value={passwords.current_password}
                    onChange={(event) => updatePasswordField('current_password', event.target.value)}
                    error={passwordErrors.current_password}
                    autoComplete="current-password"
                  />

                  <div className="tm-field-row">
                    <TextInput
                      label="New password"
                      name="password"
                      type="password"
                      required
                      value={passwords.password}
                      onChange={(event) => updatePasswordField('password', event.target.value)}
                      error={passwordErrors.password}
                      autoComplete="new-password"
                    />

                    <TextInput
                      label="Confirm new password"
                      name="password_confirmation"
                      type="password"
                      required
                      value={passwords.password_confirmation}
                      onChange={(event) => updatePasswordField('password_confirmation', event.target.value)}
                      error={passwordErrors.password_confirmation}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>

              <div className="tm-form-card__foot">
                <button type="submit" className="tm-btn tm-btn--primary" disabled={savingPassword}>
                  {savingPassword && <span className="tm-btn__spinner" aria-hidden="true" />}
                  {savingPassword ? 'Updating...' : 'Update password'}
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className="tm-stack">
          <section className="tm-panel tm-profile-card">
            <div className="tm-profile-card__cover" aria-hidden="true" />
            <div className="tm-profile-card__body">
              <div className="tm-profile-card__avatar">
                <Avatar user={user} size="xl" />
                {photoBusy && (
                  <span className="tm-profile-card__busy">
                    <span className="tm-spinner" aria-hidden="true" />
                  </span>
                )}
              </div>

              <h2>{user?.name}</h2>
              <p>{user?.email}</p>

              <div className="tm-profile-card__actions">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="tm-sr-only"
                  onChange={handlePhoto}
                />
                <button
                  type="button"
                  className="tm-btn tm-btn--secondary tm-btn--sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={photoBusy}
                >
                  <i className="bi bi-camera" aria-hidden="true" /> Upload photo
                </button>
                {user?.profile_photo_url && (
                  <button
                    type="button"
                    className="tm-btn tm-btn--ghost tm-btn--sm"
                    onClick={handleRemovePhoto}
                    disabled={photoBusy}
                  >
                    Remove
                  </button>
                )}
              </div>

              <p className="tm-hint">JPG, PNG or WebP. Maximum 2 MB.</p>
            </div>
          </section>

          <section className="tm-panel">
            <div className="tm-panel__head">
              <h2 className="tm-panel__title">Account</h2>
            </div>
            <div className="tm-panel__body tm-stack">
              <div className="tm-profile-meta">
                <span>Member since</span>
                <strong>{user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</strong>
              </div>
              <div className="tm-profile-meta">
                <span>Account status</span>
                <span className="tm-badge tm-badge-completed">Active</span>
              </div>
              <button type="button" className="tm-btn tm-btn--danger-soft tm-btn--block" onClick={() => setLogoutOpen(true)}>
                <i className="bi bi-box-arrow-right" aria-hidden="true" /> Log out
              </button>
            </div>
          </section>
        </aside>
      </div>

      <LogoutDialog open={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </>
  )
}
