import { Component } from 'solid-js'
import { Link, useRoutes, useLocation } from 'solid-app-router'
import { routes } from './routes'
import './app.css'

const App: Component = () => {
  const location = useLocation()
  const Route = useRoutes(routes)

  return (
    <>
      {/* TODO nav */}
      <Route />
    </>
  )
}

export default App
