
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Fix: Use '.' instead of process.cwd() to avoid TypeScript error "Property 'cwd' does not exist on type 'Process'"
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      // Explicitly inject these variables. We default to empty string if undefined 
      // to ensure valid syntax in the generated code.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
    },
    optimizeDeps: {
      // Ensure these are processed correctly by Vite
      include: ['pdfjs-dist', 'react-pdf']
    },
    build: {
      // Support top-level await if needed by newer libraries
      target: 'esnext'
    },
    esbuild: {
      supported: {
        'top-level-await': true
      },
    },
  }
})
