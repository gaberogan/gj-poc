import { Component } from 'solid-js'
import { css } from '@emotion/css'

const Layout: Component = (props: any) => {
  return (
    <div class={style}>
      <nav>
        <a href="/" class="flex items-center gap-1">
          <img crossorigin="" src="/logo.svg" style="height: 40px" />
          <h1 class="text-xl">GrayJay</h1>
        </a>
        <a href="/settings">
          <div>User Icon / Open Settings</div>
        </a>
      </nav>
      <aside class="sidebar">
        <section class="tabs-section">
          <a href="/"><i class="fa-solid fa-house" /> Home</a>
          <a href="/kotlin"><i class="fa-solid fa-house" /> Kotlin Home</a>
          <a href="/"><i class="fa-solid fa-newspaper" /> Subscriptions</a>
          <a><i class="fa-solid fa-layer-group" /> Playlists</a>
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

const style = css`
height: 100vh;
display: grid;
grid-template-columns: auto 1fr;
grid-template-rows: auto 1fr;
grid-gap: 4px;

> h1,
h2 {
  font-weight: bold;
}

> nav {
  grid-column: 1 / span 2;
  display: flex;
  justify-content: space-between;
  padding: 16px;
  padding-bottom: 8px;
}

main {
  overflow: hidden;
  padding: 16px;
}

> .sidebar {
  padding: 8px;

  .tabs-section {
    display: flex;
    flex-direction: column;

    a {
      padding: 8px;
      border-radius: 8px;

      &:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    }
  }

  .creator-section {
    display: flex;
    flex-direction: column;

    h2 {
      padding: 8px;
    }

    .creator-list {
      .creator {
        padding: 8px;
        border-radius: 8px;

        &:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      }
    }
  }

  .divider {
    margin: 16px 0;
    height: 1px;
    background: rgba(255, 255, 255, 0.2);
  }
}
`
