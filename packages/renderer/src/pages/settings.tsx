import { PluginProxy } from '@/services/PluginPool'
import {
  DisabledPlugin,
  disablePlugin,
  disabledPlugins,
  enablePlugin,
  enabledPlugins,
} from '@/services/plugin'
import _ from 'lodash'
import { For, Show } from 'solid-js'

export default function Settings() {
  const only1Enabled = () => enabledPlugins().length === 1

  const pluginMarkup = (plugin: DisabledPlugin | PluginProxy) => {
    const { configUrl } = plugin
    const isEnabled = plugin instanceof PluginProxy

    const enable = () => enablePlugin(configUrl)
    const disable = async () => await disablePlugin(configUrl)

    return (
      <div class="flex gap-4 py-4">
        <div>{plugin.config.name}</div>
        <Show when={isEnabled}>
          <button
            disabled={only1Enabled()}
            class={only1Enabled() ? 'opacity-50' : ''}
            onClick={disable}
          >
            Disable
          </button>
        </Show>
        <Show when={!isEnabled}>
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
      <Show when={enabledPlugins().length} fallback={<div class="py-4">Loading...</div>} keyed>
        <For each={enabledPlugins()}>{pluginMarkup}</For>
      </Show>
      <h2 style="font-weight: bold; font-size: 18px">Disabled plugins</h2>
      <For each={disabledPlugins()}>{pluginMarkup}</For>
    </section>
  )
}
