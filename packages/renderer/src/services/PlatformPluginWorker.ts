import assert from 'assert'
import { fetchJSONMemo, fetchText, fetchTextMemo } from './fetch'
import path from 'path-browserify'
import _ from 'lodash'
import { EasyPromise } from './EasyPromise'
import uuid from './uuid'
import { ipcRenderer } from 'electron'

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
  configLoaded: EasyPromise<void>
  worker: Worker | null
  bridge: any // TODO types
  available: EasyPromise

  private _locked: boolean

  private fetchId: string

  constructor(configUrl: string) {
    this.id = `plugin:${++idCounter}`
    this.fetchId = uuid()
    this.configUrl = configUrl
    this.config = null
    this.configLoaded = new EasyPromise()
    this.worker = null
    this._locked = false
    this.available = new EasyPromise().resolve()
    this.bridge = new Proxy(
      {},
      {
        // Call a function in the worker and extract the result
        get: (__, method: string) => {
          return async (...args: any[]) => {
            assert(this.enabled, 'This plugin is not enabled.')
            this.locked = true
            console.debug(`Start: ${method} (${this.id}) (${performance.now()})`)
            const result = await executeFunction(this.worker!, `source.${method}`, args)
            console.debug(`Finish: ${method}  (${this.id}) (${performance.now()})`)
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

    // Fetch plugin config
    this.config = await fetchJSONMemo(this.configUrl)
    this.configLoaded.resolve()

    await ipcRenderer.invoke('addFetchClient', this.fetchId, this.config!.allowUrls)

    // Fetch plugin script
    const scriptUrl = path.join(path.dirname(this.configUrl), this.config!.scriptUrl)
    const pluginScript = fetchTextMemo(scriptUrl)

    // Create worker
    // Must use data URL for opaque origin / CORS safety
    const dataUrlPromise = new EasyPromise<string>()
    const reader = new FileReader()
    reader.onload = (ev) => dataUrlPromise.resolve(ev.target?.result as string)
    reader.readAsDataURL(
      new Blob(
        [
          (await polyfillScript) + '\n',
          (await sourceScript) + '\n',
          httpPackageScript(this.fetchId) + '\n',
          evalScript + '\n',
          bridgePackageScript + '\n',
          (await pluginScript) + '\n',
        ],
        // Mime type is important for data url
        { type: 'text/plain' }
      )
    )
    this.worker = new Worker(await dataUrlPromise)

    // Enable
    await this.bridge.enable(this.config, {}, savedState[this.configUrl])

    // Save state
    try {
      savedState[this.configUrl] = await this.bridge.saveState()
    } catch (e) {
      // Plugin hasn't defined saveState
    }
  }

  async disable() {
    assert(this.enabled, 'This plugin is already disabled.')

    await this.available

    ipcRenderer.invoke('removeFetchClient', this.fetchId)

    this.worker!.terminate()
    this.worker = null
    this.config = null
  }
}

export default PlatformPlugin

/**
 * Post a message to a worker and await a response
 */
const postMessagePromise = async (worker: Worker, message: string): Promise<MessageEvent> => {
  const promise = new EasyPromise<MessageEvent>()

  const onMessage = (ev: MessageEvent) => {
    worker.removeEventListener('message', onMessage)
    promise.resolve(ev)
  }
  worker.addEventListener('message', onMessage)

  const onError = (ev: ErrorEvent) => {
    worker.removeEventListener('message', onMessage)
    promise.reject(ev)
  }
  worker.addEventListener('error', onError)
  worker.postMessage(message)

  return await promise
}

/**
 * Execute an arbitrary function in the worker
 */
const executeFunction = async (worker: Worker, funcName: string, args: any[]) => {
  const stringArgs = args.map((arg) => JSON.stringify(arg)).join(',')

  // Hold the result in a global reference so we can call methods on it later
  const reference = `_refs[\`${Date.now()}|${Math.random()}\`]`

  const { data } = await postMessagePromise(worker, `${reference} = ${funcName}(${stringArgs})`)

  if (!(data instanceof Object)) {
    return data
  }

  // Keep a reference to the evaluated code so we can call methods like nextPage()
  data.bridge = new Proxy(data, {
    get: (target: any, property: string) => {
      if (property in target) {
        return target[property]
      }

      return async (...args: any[]) => {
        return await executeFunction(worker, `${reference}.${property}`, args)
      }
    },
  })

  return data
}

const evalScript = `
self.onmessage = ev => {
  try {
    self.postMessage(JSON.parse(JSON.stringify(eval(ev.data) ?? null)))
  } catch (err) {
    if (/source.(\\w+) is not a function/.test(err.message)) {
      return self.postMessage(null)
    }
    
    const captcha = /Uncaught Error: ({"plugin_type":"CaptchaRequiredException".*)/.exec(err.message)?.[1]
    if (captcha) {
      throw new Error('Captcha required')
    }

    throw err
  }
}
`

const bridgePackageScript = `
_refs = {},
bridge = {
  log: console.debug,
  isLoggedIn: () => false,
}
console = {
  log: console.debug,
}
`

const httpPackageScript = (fetchId: string) => `
const _fetch = ((XMLHttpRequest) => ({
  method = 'GET',
  url,
  headers = {},
  body,
  useAuth = false,
}) => {
  const xhr = new XMLHttpRequest();
  xhr.open(method, url, false/*synchronous*/);
  xhr.setRequestHeader('Fetch-Id', '${fetchId}');
  // TODO allow setting Cookie header, may need X-Cookie
  delete headers.Cookie
  Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
  xhr.send(body);
  const isOk = xhr.status >= 200 && xhr.status < 299
  return { body: xhr.responseText, code: xhr.status, isOk }
})(XMLHttpRequest)

http = {
  GET: (url, headers) => _fetch({ url, headers }),
  POST: (url, body, headers) => _fetch({ url, headers }),
  request: (method, url, headers) => _fetch({ method, url, headers }),
  requestWithBody: (method, url, body, headers) =>  _fetch({ method, url, headers, body }),
  batch: () => {
    const requests = []
    const batcher = {
      GET: (url, headers) => {
        requests.push({ url, headers })
        return batcher
      },
      POST: (url, body, headers) => {
        requests.push({ url, headers, body })
        return batcher
      },
      request: (method, url, headers) => {
        requests.push({ method, url, headers })
        return batcher
      },
      requestWithBody: (method, url, body, headers) => {
        requests.push({ method, url, headers, body })
        return batcher
      },
      execute: () => {
        return requests.map(_fetch)
      },
    }
    return batcher
  },
}
`
