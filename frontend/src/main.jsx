
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import 'bootstrap-icons/font/bootstrap-icons.css'
import './styles/index.css'

import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Toaster from './components/Toaster'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found. Check your index.html file.')
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
          <Toaster />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
