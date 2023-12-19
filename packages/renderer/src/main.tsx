/* @refresh reload */
import 'tailwindcss/tailwind.css'

import { onMount } from 'solid-js'
import { render } from 'solid-js/web'
import { Router, createIntegration } from 'solid-app-router'
import App from './app'
import { channelUrls } from './services/mocks'
import PlatformPlugin from './services/PlatformPlugin'

function bindEvent(target: EventTarget, type: string, handler: EventListener) {
  target.addEventListener(type, handler)
  return () => target.removeEventListener(type, handler)
}

function electronIntegration() {
  return createIntegration(
    () => window.location.hash.slice(1),
    ({ value, scroll }) => {
      if (value.includes('index.html#')) {
        value = new URL('file://' + value).hash
      }
      window.location.hash = value.startsWith('/#/') ? value.slice(2) : value
      if (scroll) {
        window.scrollTo(0, 0)
      }
    },
    (notify) => bindEvent(window, 'hashchange', () => notify()),
    {
      go: (delta) => window.history.go(delta),
      renderPath: (path) => `#${path}`,
    }
  )
}

render(() => {
  onMount(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  })

  return (
    <Router source={electronIntegration()}>
      <App />
    </Router>
  )
}, document.getElementById('root') as HTMLElement)

// Benchmark

// console.log('start', performance.now())

// const THREADS = 1
// const NUM_CHANNELS = 1

// const urls = channelUrls.slice(0, NUM_CHANNELS)

// await Promise.all(
//   new Array(THREADS).fill(0).map(async () => {
//     const plugin = new PlatformPlugin('')
//     await plugin.enable()
//     while (urls.length > 0) {
//       const res = await plugin.bridge.getChannelContents(urls.splice(0, 1)[0], 'VIDEOS')
//       console.log(res)
//     }
//   })
// )

// console.log('end', performance.now())
