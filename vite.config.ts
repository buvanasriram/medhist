
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, '.', '');

  return {
    base: './', 
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['medhist-logo.svg'],
        manifest: {
          name: 'medHist: Family Medical Timeline',
          short_name: 'medHist',
          description: 'Secure family medical records and timeline manager.',
          theme_color: '#0f7ef1',
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
          // Caching strategies
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              // Cache Google Fonts
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              // Cache Google Fonts Static Assets (woff2)
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              // Cache CDNs (PDF Worker, Tailwind, React-PDF CSS)
              // Matches cdnjs.cloudflare.com AND cdn.jsdelivr.net
              urlPattern: /^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'cdn-assets-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
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
    },
    esbuild: {
      supported: {
        'top-level-await': true
      },
    },
  }
})
