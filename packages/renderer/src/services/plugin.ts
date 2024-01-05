import _ from 'lodash'
import { PluginProxy, addPluginToPool, getPluginPool, removePluginFromPool } from './PluginPool'
import { createGlobalSignal, createStoredGlobalSignal } from './solid'
import { fetchJSONMemo } from './fetch'
import { EasyPromise } from './EasyPromise'

// Plugin URLs

const [allPluginUrls /*setAllPluginUrls*/] = createStoredGlobalSignal<string[]>('allPluginUrls', [
  '/YoutubeConfig.json',
  '/NicoConfig.json',
])

const [pluginUrlsToEnable, setPluginUrlsToEnable] = createStoredGlobalSignal<string[]>(
  'pluginUrlsToEnable',
  ['/YoutubeConfig.json']
)

// Enable plugin

export const enablePlugin = async (configUrl: string) => {
  setPluginUrlsToEnable(_.uniq([...pluginUrlsToEnable(), configUrl]))
  await addPluginToPool(configUrl)
  await Promise.all([loadPlugins(), loadPluginConfigs()])
}

// Disable plugin

export const disablePlugin = async (configUrl: string) => {
  setPluginUrlsToEnable(pluginUrlsToEnable().filter((x) => x !== configUrl))
  await removePluginFromPool(configUrl)
  await Promise.all([loadPlugins(), loadPluginConfigs()])
}

// Load enabled plugins

const [_enabledPlugins, _setEnabledPlugins] = createGlobalSignal<PluginProxy[]>([])
const enabledPlugins = _enabledPlugins

let _pluginsLoaded: EasyPromise<void>
export const pluginsLoaded = () => _pluginsLoaded

const loadPlugins = async () => {
  _pluginsLoaded = new EasyPromise()
  const plugins = await Promise.all(pluginUrlsToEnable().map(getPluginPool))
  _setEnabledPlugins(plugins)
  _pluginsLoaded.resolve()
}

loadPlugins().then(() => {
  console.log(`Loaded plugins, timestamp ${Math.round(performance.now())}ms`)
})

// Load plugin configs

export interface PluginConfig {
  enabled: boolean
  configUrl: string
  [key: string]: any
}

const [_pluginConfigs, _setPluginConfigs] = createGlobalSignal<PluginConfig[]>([])
export const pluginConfigs = _pluginConfigs

const loadPluginConfigs = async () => {
  let configs = await Promise.all(
    allPluginUrls().map(async (configUrl) => {
      const config = await fetchJSONMemo(configUrl)
      return { ...config, configUrl, enabled: pluginUrlsToEnable().includes(configUrl) }
    })
  )
  _setPluginConfigs(configs)
}

loadPluginConfigs()

// Find plugin for channel URL

export const findPluginForChannelUrl = async (url: string) => {
  await pluginsLoaded()
  const matches = await Promise.all(
    enabledPlugins().map(async (plugin) => {
      const match = await plugin.bridge.isChannelUrl(url)
      return {
        plugin,
        match,
      }
    })
  )

  const result = matches.find((x) => x.match)

  if (!result) {
    throw new Error(`No plugin found matching url ${url}`)
  }

  return result.plugin
}

// Find plugin for video URL

export const findPluginForVideoUrl = async (url: string) => {
  await pluginsLoaded()
  const matches = await Promise.all(
    enabledPlugins().map(async (plugin) => {
      const match = await plugin.bridge.isContentDetailsUrl(url)
      return {
        plugin,
        match,
      }
    })
  )

  const result = matches.find((x) => x.match)

  if (!result) {
    throw new Error(`No plugin found matching url ${url}`)
  }

  return result.plugin
}
