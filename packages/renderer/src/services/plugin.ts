import { getPluginPool } from './PluginPool'

// TODO error when adding multiple plugins
export const ENABLED_PLUGINS = ['/YoutubeConfig.json']

export const getPlugins = () => Promise.all(ENABLED_PLUGINS.map(getPluginPool))

export const findPluginForChannelUrl = async (url: string) => {
  const plugins = await getPlugins()
  const matches = await Promise.all(
    plugins.map(async (plugin) => {
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
  const plugins = await getPlugins()
  const matches = await Promise.all(
    plugins.map(async (plugin) => {
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
