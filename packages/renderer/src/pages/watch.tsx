import VideoPlayer from '@/components/VideoPlayer'
import { useSearchParams } from '@solidjs/router'

export default function Watch() {
  const [searchParams] = useSearchParams()

  return <VideoPlayer url={searchParams.url} />
}
