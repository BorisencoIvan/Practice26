// vite.config.js
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://speakers-leon-solar-lucas.trycloudflare.com',
        changeOrigin: true,
      }
    }
  }
})