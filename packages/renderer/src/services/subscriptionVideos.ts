import * as store from 'idb-keyval'
import { subscriptionUrls } from './mocks'
import { enabledPlugins, findPluginForChannelUrl, pluginsEnabled } from './plugin'
import { createGlobalSignal } from './solid'
import _ from 'lodash'

// TODO plugin.config.subscriptionRateLimit
const RATE_LIMIT = 1

// Pager interface
interface Pager {
  results: PlatformVideo[]
  hasMore: boolean
  bridge: any
}
let pagers: Pager[]

// Typed subscription cache
const CACHE_KEY = 'subscription_cache'
const cache = {
  get: (): Promise<PlatformVideo[]> => store.get<PlatformVideo[]>(CACHE_KEY).then((x) => x ?? []),
  set: (value: PlatformVideo[]): Promise<void> => store.set(CACHE_KEY, value),
  clear: (): Promise<void> => store.del(CACHE_KEY),
}

// Subscription videos global variable
const [_subVideos, _setSubVideos] = createGlobalSignal<PlatformVideo[]>([])

/**
 * Subscribed videos getter
 * Changes when cache updates or enabled plugins change
 */
export const getSubVideos = () => {
  const subVideos = _subVideos()
  return filterEnabledVideos(subVideos)
}

// Subscribed videos setter
const setSubVideos = async (videos: PlatformVideo[]) => {
  await cache.set(videos)
  _setSubVideos(videos)
}

/**
 * A promise that fulfills when subscribed videos are populated from persistent storage
 */
export const hydratedSubVideos = cache.get().then(_setSubVideos)

/**
 * Refresh subscribed videos starting at page 1
 */
export const refreshSubVideos = async () => {
  await hydratedSubVideos
  await pluginsEnabled
  const channelUrls = await getPrioritizedChannels()
  const cachedVideos = getSubVideos()
  let videos = await fetchVideosForChannels(channelUrls)
  videos = _.uniqBy([...videos, ...cachedVideos], 'id.value')
  videos = _.orderBy(videos, 'datetime', 'desc')
  await setSubVideos(videos)
}

const getPrioritizedChannels = async () => {
  await hydratedSubVideos
  await pluginsEnabled
  const videos = getSubVideos()
  const fetchTimestamps = Object.fromEntries(
    _.uniqBy(videos, 'author.url').map((v) => [v.author.url, v.fetchedAt])
  )
  let channels = subscriptionUrls.map((url) => ({ url, fetchedAt: fetchTimestamps[url] || 0 }))
  channels = _.orderBy(channels, 'fetchedAt', 'asc')
  return channels.map((c) => c.url).slice(0, RATE_LIMIT)
}

const fetchVideosForChannels = async (urls: string[]) => {
  // Fetch videos for each channel
  const results = await Promise.allSettled<Pager>(
    urls.map(async (url) => {
      const plugin = await findPluginForChannelUrl(url)
      const pager = await plugin.bridge.getChannelContents(url, 'VIDEOS')
      return pager
    })
  )

  // Get pagers
  pagers = results
    .map((x) => (x.status === 'fulfilled' ? x.value : null))
    .filter((x) => x) as Pager[]
  let videos = pagers.map((pager) => pager.results).flat()

  // Add fetch timestamp to videos
  const now = Date.now()
  videos = videos.map((v) => {
    v.fetchedAt = now
    return v
  })

  return videos
}

/**
 * NOTE If you use this, you might need to `await pluginsEnabled`
 * TODO avoid using platformUrls not part of spec, store plugin id in cache instead
 */
const filterEnabledVideos = (videos: PlatformVideo[]) => {
  const platformUrls = enabledPlugins().map((x) => x.config.platformUrl)
  return videos.filter((vid) => platformUrls.some((pUrl) => vid.url.startsWith(pUrl)))
}
