import { setSubscribedVideosCache } from './SubscriptionCache'
import { subcscriptionUrls } from './mocks'
import { findPluginForChannelUrl } from './plugin'

export const fetchSubscribedVideos = async ({
  channelLimit = 2,
}: { channelLimit?: number } = {}) => {
  const urls = subcscriptionUrls.slice(0, channelLimit)

  // TODO allSettled, gracefully handle errors
  const pagers = await Promise.all(
    urls.map(async (url) => {
      const plugin = await findPluginForChannelUrl(url)
      const pager = await plugin.bridge.getChannelContents(url, 'VIDEOS')
      return pager
    })
  )

  const videos = pagers.map((pager) => pager.results).flat()

  // Don't wait for cache
  setSubscribedVideosCache(videos)

  return videos
}
