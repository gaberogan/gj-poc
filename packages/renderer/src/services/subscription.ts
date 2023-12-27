import {
  clearSubscribedVideosCache,
  getSubscribedVideosCache,
  setSubscribedVideosCache,
} from './SubscriptionCache'
import { subcscriptionUrls } from './mocks'
import { findPluginForChannelUrl } from './plugin'
import { createGlobalSignal } from './solid'

const [_subscribedVideos, _setSubscribedVideos] = createGlobalSignal<number[]>([]) // TODO types
export const subscribedVideos = _subscribedVideos

export const hydratedSubscriptions = getSubscribedVideosCache().then((videos) => {
  return _setSubscribedVideos(videos)
})

export const refreshSubscribedVideos = async () => {
  await hydratedSubscriptions
  const videos = fetchSubscribedVideos()
  await clearSubscribedVideosCache()
  await setSubscribedVideosCache(await videos)
  _setSubscribedVideos(await getSubscribedVideosCache())
}

// TODO change default limit
const fetchSubscribedVideos = async ({ channelLimit = 2 }: { channelLimit?: number } = {}) => {
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

  return videos
}
