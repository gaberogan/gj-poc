import { getPluginPool } from './PluginPool'

// TODO error when adding multiple plugins
const ENABLED_PLUGINS = ['/YoutubeConfig.json']

export const getPlugins = () => Promise.all(ENABLED_PLUGINS.map(getPluginPool))

export const findPluginForChannelUrl = async (url: string) => {
  const plugins = await getPlugins()
  const channelMatches = await Promise.all(
    plugins.map(async (plugin) => {
      const isChannelUrl = await plugin.bridge.isChannelUrl(url)
      return {
        plugin,
        isChannelUrl,
      }
    })
  )

  const result = channelMatches.find((x) => x.isChannelUrl)

  if (!result) {
    throw new Error(`No plugin found matching url ${url}`)
  }

  return result.plugin
}
