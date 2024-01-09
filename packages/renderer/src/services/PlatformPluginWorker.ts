// This code runs in the iframe

import assert from './assert'
import { fetchJSONMemo, fetchText, fetchTextMemo } from './fetch'
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
  private id: string

  configUrl: string
  config: { [key: string]: any } | null // TODO types
  worker: Worker | null
  exec: (method: string, args?: any[]) => any

  constructor(configUrl: string) {
    this.id = `plugin:${++idCounter}`
    this.configUrl = configUrl
    this.config = null
    this.worker = null
    this.exec = async (method: string, args: any[] = []) => {
      assert(this.enabled, 'This plugin is not enabled.')
      console.debug(`Start: ${method} (${this.id}) (${performance.now()})`)
      const result = await executeFunction(this.worker!, method, args)
      console.debug(`Finish: ${method}  (${this.id}) (${performance.now()})`)
      return result
    }
  }

  get enabled(): boolean {
    return Boolean(this.config)
  }

  async enable() {
    assert(!this.enabled, 'This plugin is already enabled.')

    // Fetch plugin config
    this.config = await fetchJSONMemo(this.configUrl)

    // Fetch plugin script
    const scriptUrl = path.join(path.dirname(this.configUrl), this.config!.scriptUrl)
    const pluginScript = fetchTextMemo(scriptUrl)

    // Code for worker
    const code = `
    ${await polyfillScript}
    ${await sourceScript}
    ${httpPackageScript}
    ${evalScript}
    ${bridgePackageScript}
    ${securityScript}
    ${await pluginScript}`

    // Create worker
    const codeBlob = new Blob([code], { type: 'application/javascript' })
    this.worker = new Worker(URL.createObjectURL(codeBlob))

    // Enable
    await this.exec('source.enable', [this.config, {}, savedState[this.configUrl]])

    // Save state
    try {
      savedState[this.configUrl] = await this.exec('source.saveState')
    } catch (e) {
      // Plugin hasn't defined saveState
    }
  }

  async disable() {
    assert(this.enabled, 'This plugin is already disabled.')

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

  // Keep a serializable reference to send via postMessage
  data.reference = reference

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

// TODO secure fetch with domain allowlist
const httpPackageScript = `
const _fetch = ((XMLHttpRequest) => ({
  method = 'GET',
  url,
  headers = {},
  body,
  useAuth = false,
}) => {
  const xhr = new XMLHttpRequest();
  xhr.open(method, url, false/*synchronous*/);
  // xhr.setDisableHeaderCheck(true); // TODO allow setting Cookie header, may need nodeIntegrationInWorker + node-xmlhttprequest
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

// TODO secure all insecure globals
const securityScript = `
function secure(prop) {
  Object.defineProperty(self, prop, {
    get: () => { throw new Error(\`GrayJay Security Exception: cannot access \${prop}\`) },
    configurable: false
  });
}
secure('fetch')
secure('XMLHttpRequest')
secure('importScripts')
`
