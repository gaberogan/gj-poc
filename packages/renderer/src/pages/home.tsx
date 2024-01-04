import VideoList from '@/components/VideoList'
import { getSubVideos } from '@/services/subscriptionVideos'

// TODO pull to refresh and indicator when refreshing on page load

export default function Home() {
  return <VideoList videos={getSubVideos()} hasNextPage={false} />
}
