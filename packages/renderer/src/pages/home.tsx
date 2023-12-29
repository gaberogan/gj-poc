import VideoList from '@/components/VideoList'
import { subVideos } from '@/services/subscriptionVideos'

// TODO pull to refresh

export default function Home() {
  return <VideoList videos={subVideos()} hasNextPage={false} />
}
