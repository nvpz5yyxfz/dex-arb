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
        target: 'https://api.starknet.extended.exchange',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/extended/, '/api'),
        secure: true,
      },
      '/api/pacifica': {
        target: 'https://api.pacifica.fi',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pacifica/, '/api'),
        secure: true,
      },
      '/api/grvt': {
        target: 'https://market-data.grvt.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/grvt/, ''),
        secure: true,
      },
      '/api/variational': {
        target: 'https://omni-client-api.prod.ap-northeast-1.variational.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/variational/, ''),
        secure: true,
      },
    },
  },
})
