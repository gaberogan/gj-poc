// This code runs in the iframe

import PlatformPlugin from './PlatformPluginWorker'

const plugins: { [key: string]: PlatformPlugin } = {}

window.addEventListener('message', async (ev) => {
  const payload = ev.data
  const { type, id } = payload

  if (type === 'addInstance') {
    const plugin = new PlatformPlugin(payload.configUrl)
    await plugin.enable()
    plugins[id] = plugin
    window.parent.postMessage(
      {
        id,
        type: 'result',
        result: {
          config: plugin.config,
        },
      },
      '*'
    )
  }

  if (type === 'removeInstance') {
    const plugin = plugins[id]
    delete plugins[id]
    await plugin.disable()
    window.parent.postMessage(
      {
        id,
        type: 'result',
        result: null,
      },
      '*'
    )
  }

  if (type === 'executeFunction') {
    const plugin = plugins[id]
    const result = await plugin.exec(payload.method, payload.args)
    window.parent.postMessage(
      {
        id,
        type: 'result',
        result,
      },
      '*'
    )
  }
})
