import * as store from 'idb-keyval' // TODO use a file-based keyval store after moving to Node.js
import { subscriptionUrls } from './mocks'
import { findPluginForChannelUrl } from './plugin'
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

// Subscription videos global variable
const [_subVideos, _setSubVideos] = createGlobalSignal<PlatformVideo[]>([])
export const subVideos = _subVideos

// Typed subscription cache
const CACHE_KEY = 'subscription_cache'
const cache = {
  get: (): Promise<PlatformVideo[]> => store.get<PlatformVideo[]>(CACHE_KEY).then((x) => x ?? []),
  set: (value: PlatformVideo[]): Promise<void> => store.set(CACHE_KEY, value),
  clear: (): Promise<void> => store.del(CACHE_KEY),
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
  const channelUrls = await getPrioritizedChannels()
  const cachedVideos = await cache.get()
  let videos = await fetchVideosForChannels(channelUrls)
  videos = _.uniqBy([...videos, ...cachedVideos], 'id.value')
  videos = _.orderBy(videos, 'datetime', 'desc')
  await setSubVideos(videos)
}

const getPrioritizedChannels = async () => {
  const videos = await cache.get()
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

  // Log errors
  results.forEach((x) => x.status === 'rejected' && console.error(x.reason))

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

// TODO not sure how pagination will work now

// Is there a next page (turn this and pagers into global signals)
// setHasMoreSubVideos(pagers.some((x) => x.hasMore))

// Keep track of pagers and hasNextPage so we can paginate
// const [_hasMoreSubVideos, setHasMoreSubVideos] = createGlobalSignal(false)
// // Expose this so infinite scrollers can know if we have more pages
// export const hasMoreSubVideos = _hasMoreSubVideos

// /**
//  * Load the next page of subscribed videos
//  */
// export const loadMoreSubVideos = async () => {
//   const cachedVideos: any[] = (await cache.get()) ?? []
//   let videos = await fetchNextPageSubVideos()
//   videos = _.uniqBy([...cachedVideos, ...videos], 'id.value')
//   await setSubVideos(videos)
// }

// Fetch the next page of subscribed videos
// const fetchNextPageSubVideos = async (): Promise<PlatformVideo[]> => {
//   if (!pagers) {
//     throw new Error('Must fetch first page before fetching next page')
//   }

//   // Get next page of videos
//   const results = await Promise.allSettled<Pager>(
//     pagers.map(async (pager) => {
//       return pager.hasMore ? await pager.bridge.nextPage() : []
//     })
//   )
//   pagers = results
//     .map((x) => (x.status === 'fulfilled' ? x.value : null))
//     .filter((x) => x) as Pager[]
//   let videos = pagers.map((pager) => pager.results).flat()

//   // Log errors
//   results.forEach((x) => x.status === 'rejected' && console.error(x.reason))

//   // Add fetch timestamp to videos
//   const now = Date.now()
//   videos = videos.map((v) => {
//     v.fetchedAt = now
//     return v
//   })

//   // Is there a next page
//   setHasMoreSubVideos(pagers.some((x) => x.hasMore))

//   return videos
// }
