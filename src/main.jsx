import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './styles/dashboard.css'
import './styles/app-extra.css'
import './styles/dark-mode.css'
import { applyTheme, getInitialTheme } from './hooks/useTheme'
import App from './App.jsx'

applyTheme(getInitialTheme())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
