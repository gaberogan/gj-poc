import { Component } from 'solid-js'
import './app.css'
import { hydratedSubVideos, refreshSubVideos } from '@/services/subscriptionVideos'

// Load subscription videos
const start = performance.now()
hydratedSubVideos.then(refreshSubVideos).then(() => {
  const end = performance.now()
  console.debug(`End: ${Math.round(end)}ms`)
  console.debug(`Total: ${Math.round(end - start)}ms`)
})

const App: Component = (props: any) => {
  return (
    <div class="app">
      <nav>
        <a href="/">
          <h1>GrayJay Logo / Go Home</h1>
        </a>
        <a href="/settings">
          <div>User Icon / Open Settings</div>
        </a>
      </nav>
      <div class="flex">
        <aside class="sidebar">
          <section class="tabs-section">
            <div class="tab">Home</div>
            <div class="tab">Subscriptions</div>
            <div class="tab">Playlists</div>
          </section>
          <div class="divider" />
          <section class="creator-section">
            <h2>Subscriptions</h2>
            <div class="creator-list">
              <div class="creator">Veritasium</div>
              <div class="creator">Linus Tech Tips</div>
              <div class="creator">Gordon Ramsay</div>
            </div>
          </section>
        </aside>
        <main>{props.children}</main>
      </div>
    </div>
  )
}

export default App
