import { findPluginForVideoUrl } from './plugin'
import { createGlobalSignal } from './solid'

// Video details global variable
const [_videoDetail, _setVideoDetail] = createGlobalSignal<PlatformVideo[]>([])
export const videoDetail = _videoDetail

// Fetch video details
export const loadVideoDetail = async (videoUrl: string) => {
  const plugin = await findPluginForVideoUrl(videoUrl)
  const video = await plugin.bridge.getContentDetails(videoUrl, false)
  _setVideoDetail(video)
}
