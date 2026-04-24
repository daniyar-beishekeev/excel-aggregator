import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'
import obfuscator from 'vite-plugin-javascript-obfuscator'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    obfuscator({
      compact: true,
      controlFlowFlattening: true,
    })
  ],
  base: pkg.name,
  build: {
    sourcemap: true,
    minify: false,
  },
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
})
