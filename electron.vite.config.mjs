import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: { index: resolve(root, 'src/main/index.js') },
        external: ['better-sqlite3', 'express']
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: { index: resolve(root, 'src/preload/index.js') },
        output: { format: 'cjs' }
      }
    }
  },
  renderer: {
    root: resolve(root, 'src/renderer'),
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': resolve(root, 'src/renderer/src')
      }
    },
    build: {
      rollupOptions: {
        input: { index: resolve(root, 'src/renderer/index.html') }
      }
    }
  }
})
