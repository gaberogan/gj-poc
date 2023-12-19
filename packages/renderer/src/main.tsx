/* @refresh reload */
import 'tailwindcss/tailwind.css'

import { lazy, onMount } from 'solid-js'
import { render } from 'solid-js/web'
import { Route, Router } from '@solidjs/router'
import App from './app'
import { channelUrls } from './services/mocks'
import PlatformPlugin from './services/PlatformPlugin'
import Home from './pages/home'

render(() => {
  onMount(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  })

  return (
    <Router root={App}>
      <Route path="/" component={Home} />
      <Route path="/about" component={lazy(() => import('./pages/about'))} />
      <Route path="**" component={lazy(() => import('./pages/404'))} />
    </Router>
  )
}, document.getElementById('root') as HTMLElement)

// Benchmark

console.log('start', performance.now())

const THREADS = 1
const NUM_CHANNELS = 1

const urls = channelUrls.slice(0, NUM_CHANNELS)

await Promise.all(
  new Array(THREADS).fill(0).map(async () => {
    const plugin = new PlatformPlugin('')
    await plugin.enable()
    while (urls.length > 0) {
      const res = await plugin.bridge.getChannelContents(urls.splice(0, 1)[0], 'VIDEOS')
      console.log(res)
    }
  })
)

console.log('end', performance.now())
