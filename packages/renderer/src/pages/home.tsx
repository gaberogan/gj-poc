import VideoList from '@/components/VideoList'
import { getSubVideos, refreshSubVideos } from '@/services/subscriptionVideos'
import { createEffect } from 'solid-js'

// TODO pull to refresh and indicator when refreshing on page load
// TODO speed up cache to UI by not waiting for YouTube plugin to be fully enabled, config only

export default function Home() {
  createEffect(() => console.log(`${getSubVideos().length} videos`))

  // Load subscription videos
  refreshSubVideos().then(() => {
    console.log(`Got new subscriptions, timestamp: ${Math.round(performance.now())}ms`)
  })

  return <VideoList videos={getSubVideos()} hasNextPage={false} />
}
