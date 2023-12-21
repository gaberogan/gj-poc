import PlatformPlugin from './PlatformPlugin'

const maxPlugins: number = 96
const configUrls: string[] = []
const pluginPool: PlatformPlugin[] = []

const distributePlugins = async () => {
  const numConfigs = configUrls.length
  const idealNumPluginsPerConfig = Math.floor(maxPlugins / numConfigs)
  // const plugin = new PlatformPlugin(configUrl)
  // await plugin.enable()
  // pluginPool.push(plugin)
}

export const enablePlugin = async (configUrl: string) => {
  configUrls.push(configUrl)
  await distributePlugins()
}
