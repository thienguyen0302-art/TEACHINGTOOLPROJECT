import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import process from 'node:process'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const judgeTarget = `http://127.0.0.1:${process.env.PORT || process.env.JUDGE_PORT || env.JUDGE_PORT || 3001}`
  return {
    plugins: [react()],
    server: {
      proxy: Object.fromEntries(
        ['/api/judge', '/api/ai/tutor', '/api/contest', '/api/authoring'].map(path => [path, judgeTarget]),
      ),
    },
  }
})
