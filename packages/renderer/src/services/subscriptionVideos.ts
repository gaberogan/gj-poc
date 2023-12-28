import * as store from 'idb-keyval'
import { subcscriptionUrls } from './mocks'
import { findPluginForChannelUrl } from './plugin'
import { createGlobalSignal } from './solid'
import _ from 'lodash'

// Subscription videos global variable
const [_subVideos, _setSubVideos] = createGlobalSignal<PlatformVideo[]>([])
export const subVideos = _subVideos

// Subscribed videos setter
const setSubVideos = async (videos: PlatformVideo[]) => {
  videos = _.orderBy(videos, ['datetime'], ['desc'])
  await store.set('subscription_cache', videos)
  _setSubVideos(videos)
}

/**
 * A promise that fulfills when subscribed videos are populated from persistent storage
 */
export const hydratedSubVideos = store.get('subscription_cache').then((videos) => {
  if (videos) {
    return _setSubVideos(videos)
  }
})

/**
 * Refresh subscribed videos starting at page 1
 */
export const refreshSubVideos = async () => {
  await hydratedSubVideos
  let videos = await fetchFirstPageSubVideos()
  await setSubVideos(videos)
}

/**
 * Load the next page of subscribed videos
 */
export const loadMoreSubVideos = async () => {
  const cachedVideos: any[] = (await store.get('subscription_cache')) ?? []
  let videos = await fetchNextPageSubVideos()
  videos = _.uniqBy([...cachedVideos, ...videos], 'id.value')
  await setSubVideos(videos)
}

// Keep track of pagers and hasNextPage so we can paginate
let pagers: any[] // TODO types
const [_hasMoreSubVideos, setHasMoreSubVideos] = createGlobalSignal(false)
// Expose this so infinite scrollers can know if we have more pages
export const hasMoreSubVideos = _hasMoreSubVideos

// Fetch the first page of subscribed videos
const fetchFirstPageSubVideos = async ({
  channelLimit = 1, // TODO change default limit
}: { channelLimit?: number } = {}) => {
  const urls = subcscriptionUrls.slice(0, channelLimit)

  // TODO allSettled, gracefully handle errors
  pagers = await Promise.all(
    urls.map(async (url) => {
      const plugin = await findPluginForChannelUrl(url)
      const pager = await plugin.bridge.getChannelContents(url, 'VIDEOS')
      return pager
    })
  )

  const videos = pagers.map((pager) => pager.results).flat()

  setHasMoreSubVideos(pagers.some((x) => x.hasMore))

  return videos
}

// Fetch the next page of subscribed videos
const fetchNextPageSubVideos = async () => {
  if (!pagers) {
    throw new Error('Must fetch first page before fetching next page')
  }

  pagers = await Promise.all(
    pagers.map(async (pager) => {
      return pager.hasMore ? await pager.bridge.nextPage() : []
    })
  )

  const videos = pagers.map((pager) => pager.results).flat()

  setHasMoreSubVideos(pagers.some((x) => x.hasMore))

  return videos
}
