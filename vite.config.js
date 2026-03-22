import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: pkg.name,
  build: {
    sourcemap: true,
    minify: false,
  }
})
