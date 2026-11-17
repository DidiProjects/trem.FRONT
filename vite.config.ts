import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

/**
 * The browser talks only to this origin; the dev server forwards the trem.API routes.
 *
 * The session cookie is SameSite=Strict and scoped to /auth, so it only works when the
 * front and the API share an origin. Netlify does the same in production (see
 * scripts/write-redirects.mjs).
 *
 * `127.0.0.1`, never `localhost`: on Windows Node resolves `localhost` to `::1` first,
 * and Docker Desktop can leave an orphaned `::1` forward that accepts and never answers.
 */
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:3002'
const apiProxy = { target: apiTarget, changeOrigin: true, secure: true }

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3004,
    proxy: {
      '/auth': apiProxy,
      '/me': apiProxy,
    },
  },
  resolve: {
    alias: { '@': resolve(import.meta.dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
  },
})
