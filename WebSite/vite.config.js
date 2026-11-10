import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // PY2: la web reenvía /api a la API (Node en Ubuntu, puerto 4000).
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})