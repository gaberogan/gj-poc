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
      <aside class="sidebar">
        <section class="tabs-section">
          <a href="/">Home</a>
          <a href="/">Subscriptions</a>
          <a>Playlists</a>
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
  )
}

export default Layout
