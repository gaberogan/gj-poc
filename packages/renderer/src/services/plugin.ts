import { PluginProxy, getPluginPool } from './PluginPool'
import { createGlobalSignal } from './solid'

// TODO error when adding multiple plugins
let enabledPluginUrls = ['/YoutubeConfig.json', '/NicoConfig.json']

const [_enabledPlugins, _setEnabledPlugins] = createGlobalSignal<PluginProxy[]>([])

export const enabledPlugins = _enabledPlugins

export const loadEnabledPlugins = async () => {
  const plugins = await Promise.all(enabledPluginUrls.map(getPluginPool))
  _setEnabledPlugins(plugins)
}

export const pluginsEnabled = loadEnabledPlugins()

export const findPluginForChannelUrl = async (url: string) => {
  await pluginsEnabled
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

export const findPluginForVideoUrl = async (url: string) => {
  await pluginsEnabled
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
