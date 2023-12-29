import { loadVideoDetail, videoDetail } from '@/services/videoDetail'
import { createEffect } from 'solid-js'

// loadVideoDetail('https://www.youtube.com/watch?v=hpyH2nDJU9E')

const VideoPlayer = (props: { url: string }) => {
  console.log(props.url)

  createEffect(() => {
    console.log(videoDetail())
  })

  return <div>VideoPlayer: {props.url}</div>
}

export default VideoPlayer
