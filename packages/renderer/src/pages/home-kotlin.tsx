import VideoList from '@/components/VideoList'
import { getSubVideos, refreshSubVideos } from '@/services/kotlin'

// TODO pull to refresh and indicator when refreshing on page load

export default function HomeKotlin() {
  // Load subscription videos
  const start = performance.now()
  refreshSubVideos().then(() => {
    const end = performance.now()
    console.debug(`Total subscription fetch time: ${Math.round(end - start)}ms`)
  })

  return <VideoList videos={getSubVideos()} hasNextPage={false} />
}
