import assert from 'assert'
import { QuickJSAsyncContext, newAsyncContext } from 'quickjs-emscripten'
import { fetchText } from './async'
import createBridgePackage from './BridgePackage'
import createHttpPackage from './HttpPackage'
import { executeFunction } from './quickjs'

const polyfillScript = await fetchText('/polyfil.js')
const sourceScript = await fetchText('/source.js')
const pluginScript = await fetchText('/YoutubeScript.js')

/**
 * A platform plugin such as YouTube or Patreon
 */
class PlatformPlugin {
  configUrl: string
  config: { [key: string]: any } | null // TODO types
  vm: QuickJSAsyncContext | null
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
            return await executeFunction(this.vm!, `source.${method}`, args)
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

    this.vm = await createVM()

    this.vm.evalCodeAsync(polyfillScript)
    this.vm.evalCodeAsync(sourceScript)
    this.vm.evalCodeAsync(pluginScript)

    this.config = {}
  }

  async disable() {
    assert(this.enabled, 'This plugin is already disabled.')

    this.vm!.dispose()
    this.vm = null
    this.config = null
  }
}

export default PlatformPlugin

async function createVM() {
  const vm = await newAsyncContext()
  createBridgePackage(vm)
  createHttpPackage(vm)
  return vm
}
