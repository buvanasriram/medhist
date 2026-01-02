import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    base: './', 
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate', // Forces immediate update of the app when a new version is pushed
        includeAssets: ['medhist-logo.svg'],
        manifest: {
          name: 'medHist: Family Medical Timeline',
          short_name: 'medHist',
          description: 'Secure family medical records and timeline manager.',
          theme_color: '#be123c',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '.',
          icons: [
            {
              src: 'medhist-logo.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: 'medhist-logo.svg', 
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: 'medhist-logo.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            }
          ]
        },
        workbox: {
          cleanupOutdatedCaches: true, // Prevents version mismatch crashes
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/unpkg\.com\/pdfjs-dist@.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'pdf-worker-cache',
                expiration: {
                  maxEntries: 5,
                  maxAgeSeconds: 60 * 60 * 24 * 30
                }
              }
            },
            {
              urlPattern: /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                }
              }
            }
          ]
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
    },
    optimizeDeps: {
      include: ['pdfjs-dist', 'react-pdf', 'jspdf', 'jspdf-autotable']
    },
    build: {
      target: 'esnext'
    }
  }
})