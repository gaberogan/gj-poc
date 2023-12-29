import { Component } from 'solid-js'
import './Layout.css'

const Layout: Component = (props: any) => {
  return (
    <div class="Layout">
      <nav>
        <a href="/" class="flex items-center gap-1">
          <img src="/logo.svg" style="height: 40px" />
          <h1 class="text-xl">GrayJay</h1>
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

export default Layout
