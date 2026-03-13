import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      include: '**/*.jsx',
    })
  ],
  server: {
    port: 5173,
    host: true,
    strictPort: true,
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: true,
      interval: 100,
    },
    proxy: {
      '/api': {
        target: process.env.NODE_ENV === 'development' ? 'http://backend:8000' : 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'antd', 'dayjs', 'axios'],
  }
})
