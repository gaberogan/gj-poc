import assert from 'assert'
import { newAsyncContext } from 'quickjs-emscripten'
import { Arena } from 'quickjs-emscripten-sync'
import { fetchJSONMemo, fetchText, fetchTextMemo } from './fetch'
import createHttpPackage from './HttpPackage'
import { VM, executeFunction } from './quickjs'
import path from 'path-browserify'
import _ from 'lodash'
import { EasyPromise } from './EasyPromise'

let idCounter = 0

const polyfillScript = fetchText('/polyfil.js')
const sourceScript = fetchText('/source.js')

// Data saved via source.saveState()
const savedState: { [key: string]: string } = {}

/**
 * A platform plugin such as YouTube or Patreon
 */
class PlatformPlugin {
  id: string
  configUrl: string
  config: { [key: string]: any } | null // TODO types
  vm: VM | null
  bridge: any // TODO types
  available: EasyPromise

  private _locked: boolean

  constructor(configUrl: string) {
    this.id = `plugin:${++idCounter}`
    this.configUrl = configUrl
    this.config = null
    this.vm = null
    this._locked = false
    this.available = new EasyPromise().resolve()
    this.bridge = new Proxy(
      {},
      {
        // Call a function in the VM and extract the result
        get: (__, method: string) => {
          return async (...args: any[]) => {
            assert(this.enabled, 'This plugin is not enabled.')
            this.locked = true
            console.debug(`Start: ${method} (${this.id})`)
            const result = await executeFunction(this.vm!, `source.${method}`, args)
            console.debug(`Finish: ${method}  (${this.id})`)
            this.locked = false
            return result
          }
        },
      }
    )
  }

  set locked(value: boolean) {
    // Error checking
    if (this._locked === value) {
      if (this._locked) {
        throw new Error(`Plugin is already locked (${this.id})`)
      }
      if (!this._locked) {
        throw new Error(`Plugin is already unlocked (${this.id})`)
      }
    }

    // Set locked
    this._locked = value

    // Update promise
    if (this._locked) {
      this.available = new EasyPromise()
    } else {
      this.available?.resolve()
    }
  }

  get locked() {
    return this._locked
  }

  get enabled(): boolean {
    return Boolean(this.config)
  }

  async enable() {
    assert(!this.enabled, 'This plugin is already enabled.')

    this.config = await fetchJSONMemo(this.configUrl)

    const scriptUrl = path.join(path.dirname(this.configUrl), this.config!.scriptUrl)
    const pluginScript = fetchTextMemo(scriptUrl)

    this.vm = await createVM()

    this.vm.evalCodeAsync(await polyfillScript)
    this.vm.evalCodeAsync(await sourceScript)
    this.vm.evalCodeAsync(await pluginScript)

    // Enable
    await this.bridge.enable(this.config, {}, savedState[this.configUrl])

    // Save state
    savedState[this.configUrl] = await this.bridge.saveState()
  }

  async disable() {
    assert(this.enabled, 'This plugin is already disabled.')

    await this.available

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
    // TODO figure out a way to dispose these
    // Manually hold references to variables to call methods like nextPage()
    _refs: {},
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
