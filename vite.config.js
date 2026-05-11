import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'
import obfuscator from 'vite-plugin-javascript-obfuscator'
import checker from 'vite-plugin-checker'

export default defineConfig({
  plugins: [
    react(),

    obfuscator({
      apply: 'build',

      options: {
        compact: true,

        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 1,

        deadCodeInjection: true,
        deadCodeInjectionThreshold: 1,

        debugProtection: false,
        debugProtectionInterval: 4000,

        disableConsoleOutput: false,

        identifierNamesGenerator: 'hexadecimal',

        renameGlobals: false,

        rotateStringArray: true,
        selfDefending: true,
        shuffleStringArray: true,

        splitStrings: true,
        splitStringsChunkLength: 5,

        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 1,

        transformObjectKeys: true,
        unicodeEscapeSequence: false,
      }
    }),

    checker({
      typescript: true
    })
  ],

  base: '/' + pkg.name,

  build: {
    minify: 'terser',
    sourcemap: false,

    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 3
      },
      mangle: true,
      format: {
        comments: false
      }
    }
  },

  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
})
