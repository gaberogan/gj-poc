import VideoList from '@/components/VideoList'
import { getSubVideos, refreshSubVideos } from '@/services/subscriptionVideos'
import { createEffect } from 'solid-js'

// TODO add refresh/refreshing button

export default function Home() {
  createEffect(() => console.log(`${getSubVideos().length} videos`))

  // Load subscription videos
  refreshSubVideos().then(() => {
    console.log(`Got new subscriptions, timestamp: ${Math.round(performance.now())}ms`)
  })

  return <VideoList videos={getSubVideos()} hasNextPage={false} />
}
