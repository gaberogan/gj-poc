import { Component } from 'solid-js'
import './app.css'
import { hydratedSubVideos, refreshSubVideos } from '@/services/subscriptionVideos'

// Load subscription videos
const start = performance.now()
hydratedSubVideos.then(refreshSubVideos).then(() => {
  const end = performance.now()
  console.log(`End: ${Math.round(end)}ms`)
  console.log(`Total: ${Math.round(end - start)}ms`)
})

const App: Component = (props: any) => {
  return (
    <div class="app">
      <nav>
        <h1>GrayJay Logo</h1>
        <div>User Icon</div>
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
