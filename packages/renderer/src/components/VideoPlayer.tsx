import { formatNumber } from '@/services/format'
import { loadVideoDetail, videoDetail } from '@/services/videoDetail'
import { formatDistanceToNowStrict } from 'date-fns'

const VideoPlayer = (props: { url: string }) => {
  loadVideoDetail(props.url)
  return (
    <div class="VideoPlayer">
      <img class="imageUrl" src={videoDetail().thumbnails.sources.slice(-1)[0].url} />
      <div class="metadata">
        <img class="authorImageUrl" src={videoDetail().author.thumbnail} />
        <div class="metadata-right">
          <div class="title">{videoDetail().name}</div>
          <div class="small-metadata">{videoDetail().author.name}</div>
          <div class="small-metadata">
            {formatNumber(videoDetail().viewCount)} views •
            {formatDistanceToNowStrict(new Date(videoDetail().datetime * 1000))} ago
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoPlayer
