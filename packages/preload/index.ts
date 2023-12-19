import { domReady } from './utils'
import { useLoading } from './loading'

const { appendLoading, removeLoading } = useLoading()

window.onmessage = (ev) => {
  ev.data.payload === 'removeLoading' && removeLoading()
}

domReady().then(() => appendLoading())
