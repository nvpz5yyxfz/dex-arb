import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/edgex': {
        target: 'https://pro.edgex.exchange',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/edgex/, '/api'),
        secure: true,
      },
      '/api/extended': {
        target: 'https://starknet.app.extended.exchange',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/extended/, '/api'),
        secure: true,
      },
    },
  },
})
