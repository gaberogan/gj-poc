/* @refresh reload */
import 'tailwindcss/tailwind.css'

import { lazy, onMount } from 'solid-js'
import { render } from 'solid-js/web'
import { Route, Router } from '@solidjs/router'
import Layout from './components/Layout'
import Home from './pages/home'
import HomeKotlin from './pages/home-kotlin'

render(() => {
  onMount(() => {
    postMessage({ payload: 'removeLoading' }, '*')
    console.log(`Page loaded, timestamp ${Math.round(performance.now())}ms`)
  })

  return (
    <Router root={Layout}>
      <Route path="/" component={Home} />
      <Route path="/kotlin" component={HomeKotlin} />
      <Route path="/watch" component={lazy(() => import('./pages/watch'))} />
      <Route path="/settings" component={lazy(() => import('./pages/settings'))} />
      <Route path="**" component={lazy(() => import('./pages/404'))} />
    </Router>
  )
}, document.getElementById('root') as HTMLElement)
