import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// For GitHub Pages at https://<user>.github.io/<repo>/ set BASE=/<repo>/ when building.
const base = process.env.BASE ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Ministry Tracker',
        short_name: 'Ministry Tracker',
        description: 'Ministry time and personal records, stored only on this device',
        display: 'standalone',
        start_url: base,
        scope: base,
        background_color: '#f6f6f8',
        theme_color: '#2f6fed',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
