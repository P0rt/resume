import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '98.css'
import './global.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
