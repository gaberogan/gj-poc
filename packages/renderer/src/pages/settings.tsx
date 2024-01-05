import { PluginConfig, disablePlugin, enablePlugin, pluginConfigs } from '@/services/plugin'
import _ from 'lodash'
import { For, Show } from 'solid-js'

export default function Settings() {
  const enabledConfigs = () => pluginConfigs().filter((c) => c.enabled)
  const disabledConfigs = () => pluginConfigs().filter((c) => !c.enabled)
  const only1Enabled = () => enabledConfigs().length === 1

  const pluginMarkup = (plugin: PluginConfig) => {
    const { configUrl } = plugin

    const enable = () => enablePlugin(configUrl)
    const disable = async () => await disablePlugin(configUrl)

    return (
      <div class="flex gap-4 py-4">
        <div>{plugin.name}</div>
        <Show when={plugin.enabled}>
          <button
            disabled={only1Enabled()}
            class={only1Enabled() ? 'opacity-50' : ''}
            onClick={disable}
          >
            Disable
          </button>
        </Show>
        <Show when={!plugin.enabled}>
          <button onClick={enable}>Enable</button>
        </Show>
      </div>
    )
  }

  return (
    <section>
      <h1 class="text-2xl font-bold">Settings</h1>
      <div style="height: 20px" />
      <h2 style="font-weight: bold; font-size: 18px">Enabled plugins</h2>
      <Show when={enabledConfigs().length} fallback={<div class="py-4">Loading...</div>} keyed>
        <For each={enabledConfigs()}>{pluginMarkup}</For>
      </Show>
      <h2 style="font-weight: bold; font-size: 18px">Disabled plugins</h2>
      <For each={disabledConfigs()}>{pluginMarkup}</For>
    </section>
  )
}
