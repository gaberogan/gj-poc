import assert from 'assert'
import { newAsyncContext } from 'quickjs-emscripten'
import { Arena } from 'quickjs-emscripten-sync'
import { fetchJSON, fetchText } from './async'
import createHttpPackage from './HttpPackage'
import { VM, executeFunction } from './quickjs'
import { joinPathOrUrl } from './path'

const polyfillScript = fetchText('/polyfil.js')
const sourceScript = fetchText('/source.js')

/**
 * A platform plugin such as YouTube or Patreon
 */
class PlatformPlugin {
  configUrl: string
  config: { [key: string]: any } | null // TODO types
  vm: VM | null
  bridge: any // TODO types

  constructor(configUrl: string) {
    this.configUrl = configUrl
    this.config = null
    this.vm = null
    this.bridge = new Proxy(
      {},
      {
        // Call a function in the VM and extract the result
        get: (_, method: string) => {
          return async (...args: any[]) => {
            assert(this.enabled, 'This plugin is not enabled.')
            await executeFunction(this.vm!, `lastReturnedValue = source.${method}`, args)
            const result = this.vm!.arena.evalCode(`lastReturnedValue`)
            return result
          }
        },
      }
    )
  }

  get enabled(): boolean {
    return Boolean(this.config)
  }

  async enable() {
    assert(!this.enabled, 'This plugin is already enabled.')

    this.config = await fetchJSON(this.configUrl)

    const pluginScript = fetchText(joinPathOrUrl(this.configUrl, this.config!.scriptUrl))

    this.vm = await createVM()

    // TODO add caching
    this.vm.evalCodeAsync(await polyfillScript)
    this.vm.evalCodeAsync(await sourceScript)
    this.vm.evalCodeAsync(await pluginScript)

    this.bridge.enable()
  }

  async disable() {
    assert(this.enabled, 'This plugin is already disabled.')

    this.vm!.dispose()
    this.vm = null
    this.config = null
  }
}

export default PlatformPlugin

async function createVM(): Promise<VM> {
  const quickJSContext = await newAsyncContext()
  const arena = new Arena(quickJSContext, { isMarshalable: true })
  const vm = Object.assign(quickJSContext, { arena })

  arena.expose({
    console: {
      log: console.log,
    },
    bridge: {
      log: console.log,
      isLoggedIn: () => false,
    },
  })

  createHttpPackage(vm)

  return vm
}
