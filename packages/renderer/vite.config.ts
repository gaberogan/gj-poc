import { join } from 'path'
import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import pkg from '../../package.json'

/**
 * @see https://vitejs.dev/config/
 */
export default defineConfig({
  define: {
    'process.env': process.env,
  },
  mode: process.env.NODE_ENV,
  root: __dirname,
  plugins: [solidPlugin()],
  base: './',
  build: {
    target: 'esnext',
    polyfillDynamicImport: false,
    emptyOutDir: true,
    outDir: '../../dist/renderer',
  },
  resolve: {
    alias: {
      '@': join(__dirname, 'src'),
    },
  },
  server: {
    port: pkg.env.PORT,
  },
})
