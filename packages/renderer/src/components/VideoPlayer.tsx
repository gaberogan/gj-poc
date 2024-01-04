import { formatNumber } from '@/services/format'
import { loadVideoDetail, videoDetail } from '@/services/videoDetail'
import { formatDistanceToNowStrict } from 'date-fns'
import { Show, createEffect, createSignal, onCleanup } from 'solid-js'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'
import 'videojs-contrib-dash'

// TODO preview video using data from hyperlink

const VideoPlayer = (props: { url: string }) => {
  loadVideoDetail(props.url)

  const [getVideoEl, setVideoEl] = createSignal<HTMLVideoElement | null>(null)

  createEffect(() => {
    console.log(videoDetail())
  })

  createEffect(async () => {
    const video = videoDetail()
    const videoEl = getVideoEl()
    if (!videoEl || !video) {
      return
    }

    // TODO add dash support
    // const { videoSources, audioSources } = video.video

    // Create video player
    const videoPlayer = videojs(videoEl, {
      fluid: true,
      controls: true,
      poster: video.thumbnails.sources.slice(-1)[0].url,
      sources: [
        {
          src: video.video.videoSources.slice(-1)[0].url,
          type: 'video/mp4',
        },
        // {
        //   src: '/example_video2.mpd',
        //   type: 'application/dash+xml',
        // },
      ],
    })

    // Cleanup
    onCleanup(() => videoPlayer.dispose())
  })

  return (
    <Show when={videoDetail()} fallback={<div>Loading...</div>} keyed>
      {(vid) => (
        <div class="flex flex-col gap-4">
          <div data-vjs-player>
            <video ref={(el) => setVideoEl(el)} class="video-js"></video>
          </div>
          <div class="metadata">
            <img class="authorImageUrl" src={vid.author.thumbnail} />
            <div class="metadata-right">
              <div class="title">{vid.name}</div>
              <div class="small-metadata">{vid.author.name}</div>
              <div class="small-metadata">
                {formatNumber(vid.viewCount ?? 0)} views •
                {formatDistanceToNowStrict(new Date(vid.datetime ?? 0 * 1000))} ago
              </div>
            </div>
          </div>
        </div>
      )}
    </Show>
  )
}

export default VideoPlayer
