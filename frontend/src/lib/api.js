import axios from 'axios'

/**
 * Axios instance used for every call to the Laravel API.
 *
 * The Sanctum bearer token is attached to each request when present.
 * "Remember me" stores the token in localStorage (30 day token); otherwise
 * the token lives in sessionStorage and disappears when the browser closes.
 * A 401 response clears the session and bounces the user back to the login
 * screen so protected screens are never rendered for a signed out user.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

export const TOKEN_KEY = 'taskmate_token'
export const REMEMBER_KEY = 'taskmate_remember'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
}

export function isRemembered() {
  return localStorage.getItem(REMEMBER_KEY) === '1'
}

export function setToken(token, remember = false) {
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)

  if (token) {
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(REMEMBER_KEY, '1')
    } else {
      sessionStorage.setItem(TOKEN_KEY, token)
      localStorage.removeItem(REMEMBER_KEY)
    }
  } else {
    localStorage.removeItem(REMEMBER_KEY)
  }
}

api.interceptors.request.use((config) => {
  const token = getToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setToken(null)
      localStorage.removeItem('taskmate_user')

      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        window.location.assign('/login')
      }
    }

    return Promise.reject(error)
  },
)

/**
 * Normalise Laravel validation / auth errors into a flat { field: message } map.
 */
export function extractErrors(error) {
  const data = error?.response?.data

  if (!data) {
    return { general: 'Something went wrong. Please try again.' }
  }

  if (data.errors && typeof data.errors === 'object') {
    const flattened = {}

    Object.entries(data.errors).forEach(([field, messages]) => {
      flattened[field] = Array.isArray(messages) ? messages[0] : messages
    })

    return flattened
  }

  if (data.message) {
    return { general: data.message }
  }

  return { general: 'Something went wrong. Please try again.' }
}

export default api
