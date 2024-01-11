import { join } from 'path'
import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import pkg from '../../package.json'
import renderer from 'vite-plugin-electron-renderer'

/**
 * @see https://vitejs.dev/config/
 */
export default defineConfig({
  define: {
    'process.env': process.env,
  },
  mode: process.env.NODE_ENV,
  root: __dirname,
  plugins: [renderer(), solidPlugin()],
  base: './',
  build: {
    target: 'esnext',
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
