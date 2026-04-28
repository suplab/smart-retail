import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // Exclude the Amplify packages from Vite's esbuild pre-bundler.
  // aws-amplify and @aws-amplify/ui-react are massive CJS→ESM bundles;
  // Vite detects them via dynamic-import scanning and hangs trying to
  // optimise them, which blocks every subsequent module request.
  // Safe to exclude because both imports are conditional/lazy at runtime.
  optimizeDeps: {
    exclude: ['aws-amplify', '@aws-amplify/ui-react'],
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/v1': {
        target: process.env.VITE_API_BASE_URL ?? 'http://localhost:4566/restapis',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        lines: 70,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Route-level code splitting — mandatory per CLAUDE.md §6.3
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          query: ['@tanstack/react-query'],
          auth: ['aws-amplify'],
        },
      },
    },
  },
})
