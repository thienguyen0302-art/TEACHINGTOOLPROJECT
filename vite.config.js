import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import process from 'node:process'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendPort = process.env.PORT || process.env.JUDGE_PORT || env.PORT || env.JUDGE_PORT || 3001
  return {
    plugins: [react()],
    server: {
      allowedHosts: true,
      proxy: { "/api": `http://127.0.0.1:${backendPort}` }
    },
  }
})
