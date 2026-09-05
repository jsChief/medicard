import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ToastProvider, ToastViewport } from '@/components/ui/Toast'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
      <ToastViewport />
    </ToastProvider>
  </StrictMode>,
)
