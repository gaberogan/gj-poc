// This code runs in the parent window and allows access to the iframe

import assert from './assert'
import { EasyPromise } from './EasyPromise'
import { v4 as uuidv4 } from 'uuid'

// Create iframe

const createIframe = async () => {
  const iframe = document.createElement('iframe')
  iframe.src = `/iframe.html`
  // @ts-ignore
  iframe.sandbox = ['allow-scripts'].join(' ')
  iframe.style.display = 'none'
  const iframePromise = new EasyPromise()
  iframe.addEventListener('load', () => iframePromise.resolve())
  document.head.appendChild(iframe)
  await iframePromise
  return iframe
}

const iframePromise = createIframe()

// Create event target

const eventTarget = new EventTarget()

window.addEventListener('message', (ev) => {
  const type = ev.data?.type
  const id = ev.data?.id
  const result = ev.data?.result

  if (type === 'result') {
    eventTarget.dispatchEvent(
      new CustomEvent(id, {
        detail: result,
      })
    )
  }
})

const postMessagePromise = async (options: { id: string; type: string; [key: string]: any }) => {
  const promise = new EasyPromise()

  eventTarget.addEventListener(
    options.id,
    // @ts-ignore
    (ev: CustomEvent) => {
      promise.resolve(ev.detail)
    },
    {
      once: true,
    }
  )

  // TODO error listener

  const iframe = await iframePromise
  iframe.contentWindow!.postMessage(options, '*')

  return await promise
}

// Create API for iFrame

export const addInstance = async (id: string, configUrl: string): Promise<any> => {
  return await postMessagePromise({ id, type: 'addInstance', configUrl })
}

export const removeInstance = async (id: string) => {
  await postMessagePromise({ id, type: 'removeInstance' })
}

export const executeFunction = async (id: string, method: string, args: any[]) => {
  const result: any = await postMessagePromise({ id, type: 'executeFunction', method, args })

  // We kept a reference to the result in the worker, this lets us access it
  if (result.reference) {
    result.bridge = new Proxy(result, {
      get: (target: any, property: string) => {
        if (property in target) {
          return target[property]
        }

        return async (...args: any[]) => {
          return await executeFunction(id, `${result.reference}.${property}`, args)
        }
      },
    })
  }

  return result
}

class PluginProxy {
  proxyId: string

  configUrl: string
  config: { [key: string]: any } | null // TODO types
  bridge: any // TODO types

  available: EasyPromise
  private _locked: boolean

  constructor(configUrl: string) {
    this.proxyId = uuidv4()

    this.configUrl = configUrl
    this.config = null

    this._locked = false
    this.available = new EasyPromise().resolve()

    this.bridge = new Proxy(
      {},
      {
        // Call a function in the iframe worker and extract the result
        get: (__, method: string) => {
          return async (...args: any[]) => {
            assert(this.enabled, 'This plugin is not enabled.')
            this.locked = true
            const result = await executeFunction(this.proxyId, `source.${method}`, args)
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
        throw new Error(`Plugin is already locked (${this.proxyId})`)
      }
      if (!this._locked) {
        throw new Error(`Plugin is already unlocked (${this.proxyId})`)
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
    const result = await addInstance(this.proxyId, this.configUrl)
    this.config = result.config
  }

  async disable() {
    assert(this.enabled, 'This plugin is already disabled.')
    this.config = null
    await this.available
    await removeInstance(this.proxyId)
  }
}

export default PluginProxy
