/* @refresh reload */
import 'tailwindcss/tailwind.css'

import { lazy, onMount } from 'solid-js'
import { render } from 'solid-js/web'
import { Route, Router } from '@solidjs/router'
import App from './app'
import { channelUrls } from './services/mocks'
import Home from './pages/home'
import { getPluginPool } from './services/PluginPool'

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

const main = async () => {
  const start = performance.now()

  const NUM_CHANNELS = 2
  const CONFIG_URL = '/YoutubeConfig.json'

  const urls = channelUrls.slice(0, NUM_CHANNELS)

  // TODO lots of threads will mean lots of new instances before background instances are created
  await Promise.all(
    urls.map(async (url) => {
      const pool = await getPluginPool(CONFIG_URL)
      const pager = await pool.bridge.getChannelContents(url, 'VIDEOS')
      console.log(pager)
      // const nextPage = await pager.bridge.nextPage()
      // console.log(nextPage)
    })
  )

  const end = performance.now()
  console.log(`Total: ${Math.round(end - start)}ms`)
}
main()
