import VideoList from '@/components/VideoList'
import {
  hydratedSubscriptions,
  refreshSubscribedVideos,
  subscribedVideos,
} from '@/services/subscription'
import { createEffect } from 'solid-js'

export default function Home() {
  createEffect(async () => {
    const videos = await hydratedSubscriptions

    // Only refetch if nothing was in the cache
    if (!videos.length) {
      const start = performance.now()
      const newVideos = await refreshSubscribedVideos()
      const end = performance.now()
      console.log(`Total: ${Math.round(end - start)}ms`)
    }
  })

  return <VideoList videos={subscribedVideos()} />
}
