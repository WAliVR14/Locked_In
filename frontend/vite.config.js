import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Locked_In - Personal ERP & Telemetry',
        short_name: 'Locked_In',
        description: 'Unified system for finance, inventory, training, and goals.',
        theme_color: '#020617',
        background_color: '#020617',
        display: 'standalone',
        icons: [
          { src: '/vite.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/vite.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      }
    })
  ]
})