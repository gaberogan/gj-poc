import VideoList from '@/components/VideoList'
import { subVideos } from '@/services/subscriptionVideos'

// TODO pull to refresh and indicator when refreshing on page load

export default function Home() {
  return <VideoList videos={subVideos()} hasNextPage={false} />
}
