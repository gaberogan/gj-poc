/* @refresh reload */
import 'tailwindcss/tailwind.css'

import { lazy, onMount } from 'solid-js'
import { render } from 'solid-js/web'
import { Route, Router } from '@solidjs/router'
import App from './app'
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
