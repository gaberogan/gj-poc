import { spawn } from 'child_process'
import { createServer, build } from 'vite'
import electron from 'electron'

// TODO does this work
const flags = ['--ignore-connections-limit=youtube.com']

/**
 * @type {(server: import('vite').ViteDevServer) => Promise<import('rollup').RollupWatcher>}
 */
function watchMain(server) {
  /**
   * @type {import('child_process').ChildProcessWithoutNullStreams | null}
   */
  let electronProcess = null
  const { address, port } = server.httpServer.address()
  const isIPV4 = address.includes('.')
  const env = Object.assign(process.env, {
    VITE_DEV_SERVER_HOST: isIPV4 ? address : `[${address}]`,
    VITE_DEV_SERVER_PORT: port,
  })

  return build({
    configFile: 'packages/main/vite.config.ts',
    mode: 'development',
    plugins: [
      {
        name: 'electron-main-watcher',
        writeBundle() {
          electronProcess && electronProcess.kill()
          electronProcess = spawn(electron, [...flags, '.'], { stdio: 'inherit', env })
        },
      },
    ],
    build: {
      watch: true,
    },
  })
}

/**
 * @type {(server: import('vite').ViteDevServer) => Promise<import('rollup').RollupWatcher>}
 */
function watchPreload(server) {
  return build({
    configFile: 'packages/preload/vite.config.ts',
    mode: 'development',
    plugins: [
      {
        name: 'electron-preload-watcher',
        writeBundle() {
          server.ws.send({ type: 'full-reload' })
        },
      },
    ],
    build: {
      watch: true,
    },
  })
}

// bootstrap
const server = await createServer({ configFile: 'packages/renderer/vite.config.ts' })

await server.listen()
await watchPreload(server)
await watchMain(server)
