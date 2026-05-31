import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { join } from 'path'

// Read .env.local at config time so the proxy can inject the key server-side.
// The key never reaches the browser bundle — only the proxy uses it.
function readLocalEnv(): Record<string, string> {
  try {
    const lines = readFileSync(join(process.cwd(), '.env.local'), 'utf8').split('\n')
    const env: Record<string, string> = {}
    for (const line of lines) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq > 0) env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
    }
    return env
  } catch {
    return {}
  }
}

const localEnv = readLocalEnv()

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3456,
    proxy: {
      '/api/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('x-api-key', localEnv.ANTHROPIC_API_KEY ?? '')
          })
        },
      },
    },
  },
})
