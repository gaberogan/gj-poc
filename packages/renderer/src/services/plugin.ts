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

// Enabled plugins variable

const [_enabledPlugins, _setEnabledPlugins] = createGlobalSignal<PluginProxy[]>([])
export const enabledPlugins = _enabledPlugins

// Disabled plugins variable

export interface DisabledPlugin {
  configUrl: string
  config: any
}

const [_disabledPlugins, _setDisabledPlugins] = createGlobalSignal<DisabledPlugin[]>([])
export const disabledPlugins = _disabledPlugins

// Enable plugin

export const enablePlugin = async (configUrl: string) => {
  setPluginUrlsToEnable(_.uniq([...pluginUrlsToEnable(), configUrl]))
  await addPluginToPool(configUrl)
  await loadPlugins()
}

// Disable plugin

export const disablePlugin = async (configUrl: string) => {
  setPluginUrlsToEnable(pluginUrlsToEnable().filter((x) => x !== configUrl))
  await removePluginFromPool(configUrl)
  await loadPlugins()
}

// Load enabled plugins

const loadEnabledPlugins = async () => {
  const plugins = await Promise.all(pluginUrlsToEnable().map(getPluginPool))
  _setEnabledPlugins(plugins)
}

// Load disabled plugins

const loadDisabledPlugins = async () => {
  const disabledPluginUrls = _.difference(allPluginUrls(), pluginUrlsToEnable())
  const plugins = await Promise.all(
    disabledPluginUrls.map(async (configUrl) => ({
      configUrl,
      config: await fetchJSONMemo(configUrl),
    }))
  )
  _setDisabledPlugins(plugins)
}

// Load all plugins

let _pluginsLoaded: EasyPromise<void>
export const pluginsLoaded = () => _pluginsLoaded

export const loadPlugins = async () => {
  _pluginsLoaded = new EasyPromise()
  await Promise.all([loadEnabledPlugins(), loadDisabledPlugins()])
  _pluginsLoaded.resolve()
}

loadPlugins().then(() => {
  console.log(`Loaded plugins, timestamp ${Math.round(performance.now())}ms`)
})

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
