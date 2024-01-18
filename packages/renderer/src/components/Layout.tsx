import { Component } from 'solid-js'
import { css } from '@emotion/css'

const Layout: Component = (props: any) => {
  return (
    <div class={style}>
      <nav>
        <input type="text" placeholder="Search for videos or creators" />
        <a class="profile-card" href="/settings">
          <img class="profile-pic" crossorigin="" src="https://i.pravatar.cc/150?img=51" />
          <div>
            <div>Miles Davison</div>
            <img src="/polycentric-label.svg" crossorigin="" />
          </div>
          <i class="fa-solid fa-chevron-down" />
        </a>
      </nav>
      <main>{props.children}</main>
      <aside>
        <a href="/" class="flex items-center gap-1">
          <img crossorigin="" src="/logo.svg" style="height: 40px" />
          <h1 class="text-xl">GrayJay</h1>
        </a>
        <section class="tabs-section">
          <a href="/">
            <i class="fa-solid fa-house" /> Home
          </a>
          <a href="/kotlin">
            <i class="fa-solid fa-house" /> Kotlin Home
          </a>
          <a href="/">
            <i class="fa-solid fa-newspaper" /> Subscriptions
          </a>
          <a>
            <i class="fa-solid fa-layer-group" /> Playlists
          </a>
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
    grid-column: 2 / span 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 16px;
    padding-bottom: 8px;

    input {
      margin-right: auto;
      background-color: #ffffff11;
      border-radius: 100px;
      border-color: #ffffff11;
      border-width: 1px;
      padding: 8px 20px;
      flex-basis: 300px;
    }

    .profile-card {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 18px;
      font-weight: bold;
    }

    .profile-pic {
      width: 40px;
      height: 40px;
      border-radius: 100px;
    }
  }

  > main {
    grid-column: 2 / span 1;
    overflow: hidden;
    padding: 16px;
  }

  > aside {
    grid-row: 1 / span 2;
    grid-column: 1 / span 1;
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
