import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import process from 'node:process'

// Lời giải mẫu (`solutionCode`) chỉ dùng phía server/kiểm tra nội dung, giao diện không hiển thị.
// Gỡ khỏi bundle gửi cho trình duyệt để học sinh không đọc được bằng DevTools.
function stripSolutionCode() {
  const strip = (v) => {
    if (Array.isArray(v)) return v.map(strip)
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'solutionCode').map(([k, x]) => [k, strip(x)]))
    }
    return v
  }
  return {
    name: 'strip-solution-code',
    enforce: 'pre',
    transform(code, id) {
      if (!/[\\/]src[\\/]content[\\/].*\.json$/.test(id.split('?')[0])) return null
      return { code: JSON.stringify(strip(JSON.parse(code))), map: null }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendPort = process.env.PORT || process.env.JUDGE_PORT || env.PORT || env.JUDGE_PORT || 3001
  return {
    plugins: [stripSolutionCode(), react()],
    server: {
      allowedHosts: true,
      proxy: { "/api": `http://127.0.0.1:${backendPort}` }
    },
  }
})
