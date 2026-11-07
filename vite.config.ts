import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Vite normally exposes only VITE_ values to browser code. The Maps key is
  // instead served from this narrow development-only endpoint, matching the
  // deployed Worker API without placing an API secret in the client bundle.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'mews-dev-config-endpoint',
        configureServer(server) {
          server.middlewares.use('/api/config', (request, response, next) => {
            if (request.method !== 'GET') return next()
            response.statusCode = 200
            response.setHeader('Content-Type', 'application/json; charset=utf-8')
            response.setHeader('Cache-Control', 'no-store')
            response.end(JSON.stringify({ googleMapsBrowserKey: env.GOOGLE_MAPS_BROWSER_KEY || null }))
          })
        },
      },
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
  }
})
