/* @refresh reload */
import 'tailwindcss/tailwind.css'

import { lazy, onMount } from 'solid-js'
import { render } from 'solid-js/web'
import { Route, Router } from '@solidjs/router'
import App from './app'
import Home from './pages/home'
import { fetchSubscribedVideos } from './services/subscription'

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
  const videos = await fetchSubscribedVideos()
  console.log(videos)
  const end = performance.now()
  console.log(`Total: ${Math.round(end - start)}ms`)
}
main()

// // TODO: Use cache
// const cachedVideos = await getSubscribedVideosCache()
// if (cachedVideos.length) {
//   return cachedVideos
// }
