import VideoList from '@/components/VideoList'
import { hasMoreSubVideos, loadMoreSubVideos, subVideos } from '@/services/subscriptionVideos'

// TODO pull to refresh

export default function Home() {
  return (
    <VideoList
      videos={subVideos()}
      hasNextPage={hasMoreSubVideos()}
      fetchNextPage={loadMoreSubVideos}
    />
  )
}
