import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative so the same build can be served from a server root or from
  // chrome-extension://<id>/app/index.html. Safe because routing is hash-based.
  base: './',
  plugins: [react()],
})
