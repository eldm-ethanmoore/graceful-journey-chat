import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/liquidGlass.css'
import App from './App.tsx'
import { RainbowKitProvider } from './providers/RainbowKitProvider'
import GlassDistortionFilter from './components/GlassDistortionFilter'
import { initQRCodeSync } from './utils/qrCodeSyncInit'

// Initialize the QR code sync library
initQRCodeSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RainbowKitProvider>
      {/* SVG filter for glass effect */}
      <GlassDistortionFilter />
      <App />
    </RainbowKitProvider>
  </StrictMode>,
)
