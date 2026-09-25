import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// `base: './'` keeps asset URLs relative, so the build works as-is on GitHub Pages
// (served under /<repo>/), Netlify, Cloudflare Pages or any static host.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
