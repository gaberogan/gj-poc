import PlatformPlugin from './PlatformPlugin'
import { EasyPromise } from './EasyPromise'

const idealInstances: number = 1 // TODO use 16
const maxInstances: number = 96

let pluginPool: PlatformPlugin[] = []
let configUrls: string[] = []

class PluginPoolProxy {
  configUrl: string
  bridge: any

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

export const getPluginPool = async (configUrl: string) => {
  if (!configUrls.includes(configUrl)) {
    configUrls.push(configUrl)
  }

  await balancePool()

  return new PluginPoolProxy(configUrl)
}

export const disablePlugin = async (configUrl: string) => {
  configUrls = configUrls.filter((p) => p !== configUrl)
  pluginPool.filter((p) => p.configUrl === configUrl).forEach(removeInstance)
}

const balancePoolInterval = 5 * 60 * 1000
let balancePoolPromise = new EasyPromise().resolve()

/**
 * Add or subtract plugin instances until we are at idealInstances.
 * If you await this we guarantee at least once instance will be available
 */
const balancePool = async () => {
  // Already balancing, resolve all calls when done
  // This prevents a race condition where a plugin may be initialized twice
  if (!balancePoolPromise.isResolved) {
    return balancePoolPromise
  }
  balancePoolPromise = new EasyPromise()

  const numConfigs = configUrls.length
  const idealNumInstancesPerPlugin = Math.min(idealInstances, Math.floor(maxInstances / numConfigs))

  // Spawn new instances
  await Promise.all(
    await configUrls.map(async (configUrl: string) => {
      const pluginInstances = pluginPool.filter((p) => p.configUrl === configUrl)
      const numInstancesToAddOrRemove = idealNumInstancesPerPlugin - pluginInstances.length

      // Initialize one first
      if (pluginInstances.length === 0) {
        pluginInstances.push(await addInstance(configUrl))
      }

      // Add instances until we are at ideal number
      // DO NOT AWAIT, let it scale up in the background
      const numInstancesToAdd = Math.max(0, numInstancesToAddOrRemove)
      new Array(numInstancesToAdd).fill(0).map(() => addInstance(configUrl))

      // Remove instances not in use
      // Fire and forget, these get removed synchronously
      const numInstancesToRemove = Math.max(0, -numInstancesToAddOrRemove)
      pluginInstances
        .filter((p) => !p.locked)
        .slice(0, numInstancesToRemove)
        .map((x) => removeInstance(x))
    })
  )

  balancePoolPromise.resolve()
}

// Balance pool periodically
setTimeout(balancePool, balancePoolInterval)
