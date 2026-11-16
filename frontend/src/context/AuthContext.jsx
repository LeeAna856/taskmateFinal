
import { useCallback, useEffect, useMemo, useState } from 'react'
import api, { getToken, isRemembered, setToken } from '../lib/api'
import { AuthContext } from './auth-context'

const USER_KEY = 'taskmate_user'

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (getToken() ? readStoredUser() : null))
  const [loading, setLoading] = useState(Boolean(getToken()))

  const persistUser = useCallback((nextUser) => {
    setUser(nextUser)

    if (nextUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    } else {
      localStorage.removeItem(USER_KEY)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Clear the session even if the token is invalid.
    }

    setToken(null)
    persistUser(null)
  }, [persistUser])

  useEffect(() => {
    let cancelled = false

    async function restore() {
      if (!getToken()) {
        persistUser(null)
        setLoading(false)
        return
      }

      try {
        const { data } = await api.get('/auth/me')

        if (!cancelled) {
          persistUser(data.user)
        }
      } catch {
        if (!cancelled) {
          setToken(null)
          persistUser(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    restore()

    return () => {
      cancelled = true
    }
  }, [persistUser])

  const login = useCallback(async (credentials) => {
    const { data } = await api.post('/auth/login', credentials)

    setToken(data.token, Boolean(credentials.remember))
    persistUser(data.user)

    return data
  }, [persistUser])

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload)

    setToken(data.token, false)
    persistUser(data.user)

    return data
  }, [persistUser])

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me')

    persistUser(data.user)

    return data.user
  }, [persistUser])

  const updateProfile = useCallback(async (payload) => {
    const { data } = await api.put('/auth/profile', payload)

    persistUser(data.user)

    return data
  }, [persistUser])

  const uploadPhoto = useCallback(async (file) => {
    const formData = new FormData()
    formData.append('photo', file)

    const { data } = await api.post('/auth/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    persistUser(data.user)

    return data
  }, [persistUser])

  const deletePhoto = useCallback(async () => {
    const { data } = await api.delete('/auth/profile/photo')

    persistUser(data.user)

    return data
  }, [persistUser])

  const changePassword = useCallback(async (payload) => {
    const { data } = await api.put('/auth/password', payload)

    if (data.token) {
      setToken(data.token, isRemembered())
    }

    return data
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    refreshUser,
    updateProfile,
    uploadPhoto,
    deletePhoto,
    changePassword,
  }), [
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    updateProfile,
    uploadPhoto,
    deletePhoto,
    changePassword,
  ])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
