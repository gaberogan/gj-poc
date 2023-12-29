import { EasyPromise } from './EasyPromise'
import PlatformPlugin from './PlatformPlugin'

const idealInstances: number = 1 // TODO use 16
const maxInstances: number = 96

let pluginPool: PlatformPlugin[] = []
let configUrls: string[] = []

class PluginProxy {
  configUrl: string
  bridge: any

  get config() {
    const instance = pluginPool.find((p) => p.configUrl === this.configUrl)

    if (!instance) {
      throw new Error('Please initialize plugin before accessing config')
    }

    return instance.config!
  }

  constructor(configUrl: string) {
    this.configUrl = configUrl
    this.bridge = new Proxy(
      {},
      {
        get: (__, property) => {
          return async (...args: any[]) => {
            const plugin = await requestInstance(configUrl)
            // Unlock the plugin so we can call a function on it
            plugin.locked = false
            const result = await plugin.bridge[property](...args)
            return result
          }
        },
      }
    )
  }
}

/**
 * Requests an unlocked instance and locks it to reserve it for you
 * Locking must be done synchronously to avoid 2 functions claiming it at once
 */
const requestInstance = async (configUrl: string): Promise<PlatformPlugin> => {
  let instance

  // Find available instance
  instance = pluginPool.find((p) => p.configUrl === configUrl && !p.locked)

  // All instances are locked, create a new one
  if (!instance && pluginPool.length < maxInstances) {
    instance = await addInstance(configUrl, { locked: true })
  }

  // Wait for an instance to become available
  if (!instance) {
    const lockedInstances = pluginPool.filter((p) => p.configUrl === configUrl)
    instance = await Promise.any(
      lockedInstances.map(async (p) => {
        await p.available
        return p
      })
    )
  }

  if (!instance.locked) {
    instance.locked = true
  }

  return instance
}

/**
 * Add an instance to the plugin pool.
 * Locking must be done synchronously to avoid 2 functions claiming it at once
 */
const addInstance = async (configUrl: string, { locked = false }: { locked?: boolean } = {}) => {
  if (pluginPool.length >= maxInstances) {
    throw new Error('Reached maximum plugin instances, try to disable some plugins')
  }

  const plugin = new PlatformPlugin(configUrl)
  await plugin.enable()
  pluginPool.push(plugin)

  if (plugin.locked !== locked) {
    plugin.locked = locked
  }

  return plugin
}

const removeInstance = async (plugin: PlatformPlugin) => {
  pluginPool = pluginPool.filter((x) => x !== plugin)
  await plugin.disable()
}

const getIdealInstancesPerPlugin = () => {
  const numConfigs = configUrls.length
  return Math.min(idealInstances, Math.floor(maxInstances / numConfigs))
}

/**
 * Add instances until we are at ideal number
 */
const scaleUp = async () => {
  await Promise.all(
    await configUrls.map(async (configUrl: string) => {
      const pluginInstances = pluginPool.filter((p) => p.configUrl === configUrl)
      const numInstancesToAdd = Math.max(0, getIdealInstancesPerPlugin() - pluginInstances.length)
      await Promise.all(new Array(numInstancesToAdd).fill(0).map(() => addInstance(configUrl)))
    })
  )
}

/**
 * Remove unused instances until we are at ideal number
 */
const scaleDown = async () => {
  await Promise.all(
    await configUrls.map(async (configUrl: string) => {
      const pluginInstances = pluginPool.filter((p) => p.configUrl === configUrl)
      const numInstancesToAdd = getIdealInstancesPerPlugin() - pluginInstances.length
      const numInstancesToRemove = Math.max(0, -numInstancesToAdd)
      await Promise.all(
        pluginInstances
          .filter((p) => !p.locked)
          .slice(0, numInstancesToRemove)
          .map((x) => removeInstance(x))
      )
    })
  )
}

export const disablePlugin = async (configUrl: string) => {
  configUrls = configUrls.filter((p) => p !== configUrl)
  pluginPool.filter((p) => p.configUrl === configUrl).forEach(removeInstance)
}

const enableInProgress: { [key: string]: EasyPromise | undefined } = {}

export const enablePlugin = async (configUrl: string) => {
  if (configUrls.includes(configUrl)) {
    throw new Error('Plugin is already enabled')
  }

  // Return the same promise if called multiple times
  if (enableInProgress[configUrl]) {
    return enableInProgress[configUrl]
  }
  enableInProgress[configUrl] = new EasyPromise()

  // Enable the plugin
  const pluginInstances = pluginPool.filter((p) => p.configUrl === configUrl)
  if (pluginInstances.length === 0) {
    pluginInstances.push(await addInstance(configUrl))
  }
  configUrls.push(configUrl)

  // Resolve the promise
  enableInProgress[configUrl]!.resolve()
  delete enableInProgress[configUrl]
}

export const getPluginPool = async (configUrl: string) => {
  if (!configUrls.includes(configUrl)) {
    await enablePlugin(configUrl)
  }

  return new PluginProxy(configUrl)
}

// Balance pool periodically
let balancingPool = false
setTimeout(async () => {
  if (balancingPool) {
    return
  }
  balancingPool = true

  await scaleUp()
  await scaleDown()

  balancingPool = false
}, 60 * 1000)
