import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// The login screen served by auth.didilv93.com at /if/flow/* (trem.AUTH's edge), next to
// authentik. Built apart from the app: it needs none of the app's routes or trem.API.
export default defineConfig({
  plugins: [react()],
  base: '/if/flow/',
  resolve: {
    alias: { '@': resolve(import.meta.dirname, 'src') },
  },
  build: {
    outDir: 'dist-login',
    emptyOutDir: true,
    rollupOptions: { input: resolve(import.meta.dirname, 'login.html') },
  },
})
