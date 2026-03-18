import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/renderer/index.html'),
        widget: path.resolve(__dirname, 'src/renderer/widget.html'),
        focus: path.resolve(__dirname, 'src/renderer/focus.html'),
      },
    },
  },
  server: {
    port: 6173,
    strictPort: true,
  },
})
