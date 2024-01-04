import { For } from 'solid-js'

// TODO allow enable/disable

export default function Settings() {
  return (
    <section>
      <h1 class="text-2xl font-bold">Settings</h1>
      <div style="height: 20px" />
      <h2 style="font-weight: bold; font-size: 18px">Enabled plugins</h2>
      <For each={[]}>
        {(plugin) => {
          return <div style="padding: 16px 0">{plugin}</div>
        }}
      </For>
    </section>
  )
}
