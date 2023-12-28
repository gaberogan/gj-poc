import VideoList from '@/components/VideoList'
import {
  hasMoreSubVideos,
  hydratedSubVideos,
  loadMoreSubVideos,
  refreshSubVideos,
  subVideos,
} from '@/services/subscriptionVideos'
import { createEffect } from 'solid-js'

const loadedSubscriptions = false

export default function Home() {
  createEffect(async () => {
    const videos = await hydratedSubVideos

    // TODO remove !videos.length, use loadedSubscriptions
    // Only refetches if nothing was in the cache, this disables pagination
    // if (!videos.length) {
    const start = performance.now()
    await refreshSubVideos()
    const end = performance.now()
    console.log(`End: ${Math.round(end)}ms`)
    console.log(`Total: ${Math.round(end - start)}ms`)
    // }
  })

  // TODO pull to refresh

  return (
    <VideoList
      videos={subVideos()}
      hasNextPage={hasMoreSubVideos()}
      fetchNextPage={loadMoreSubVideos}
    />
  )
}
