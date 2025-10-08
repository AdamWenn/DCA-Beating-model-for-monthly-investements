import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use relative base so the build works on GitHub Pages project sites
// (served under /<repo>/). This makes asset URLs relative.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173
  }
})
