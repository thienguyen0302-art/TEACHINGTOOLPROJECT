import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    proxy: { "/api/judge": "http://127.0.0.1:3001", "/api/ai/tutor": "http://127.0.0.1:3001" }
  },
})
