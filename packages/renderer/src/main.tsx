/* @refresh reload */
import 'tailwindcss/tailwind.css'

import { lazy, onMount } from 'solid-js'
import { render } from 'solid-js/web'
import { Route, Router } from '@solidjs/router'
import Layout from './components/Layout'
import Home from './pages/home'
import { hydratedSubVideos, refreshSubVideos } from '@/services/subscriptionVideos'

// TODO uncomment
// Load subscription videos
const start = performance.now()
hydratedSubVideos.then(refreshSubVideos).then(() => {
  const end = performance.now()
  console.debug(`End: ${Math.round(end)}ms`)
  console.debug(`Total: ${Math.round(end - start)}ms`)
})

render(() => {
  onMount(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  })

  return (
    <Router root={Layout}>
      <Route path="/" component={Home} />
      <Route path="/watch" component={lazy(() => import('./pages/watch'))} />
      <Route path="/settings" component={lazy(() => import('./pages/settings'))} />
      <Route path="**" component={lazy(() => import('./pages/404'))} />
    </Router>
  )
}, document.getElementById('root') as HTMLElement)
