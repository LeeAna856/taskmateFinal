import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import laravel from 'laravel-vite-plugin'

const root = path.dirname(fileURLToPath(import.meta.url))

/**
 * Render / local : the React app is built into the Laravel `public/build`
 *                  folder and served by Blade through @vite.
 * Vercel         : a normal Vite single page app (index.html entry) in `dist`.
 */
export default defineConfig({
  envDir: path.resolve(root, '../backend'),
  plugins: [
    ...(process.env.VERCEL
      ? []
      : [
          laravel({
            publicDirectory: path.resolve(root, '../backend/public'),
            buildDirectory: 'build',
            hotFile: path.resolve(root, '../backend/public/hot'),
            input: {
              'src/main.jsx': path.resolve(root, 'src/main.jsx'),
              'src/styles/index.css': path.resolve(root, 'src/styles/index.css'),
            },
            refresh: true,
          }),
        ]),
    react(),
  ],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      '/sanctum': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: process.env.VERCEL
      ? path.resolve(root, 'dist')
      : path.resolve(root, '../backend/public/build'),
    emptyOutDir: true,
    manifest: process.env.VERCEL ? false : 'manifest.json',
  },
})