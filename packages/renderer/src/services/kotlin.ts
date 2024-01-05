// Kotlin Backend

import { fetchJSON } from './fetch'
import { createGlobalSignal } from './solid'

const fetchEndpoint = (endpoint: string) => fetchJSON('http://localhost:8080' + endpoint)

// Hosted at http://localhost:8080

// Subscriptions

// GET:/subscriptions/SubscriptionsLoadCache
// Loads a subscription pager exclusively from (database) cache

// GET:/subscriptions/SubscriptionsLoad
// Loads a subscription pager using live pagers (rate-limited) + database cache

// GET:/subscriptions/SubscriptionsNextPage
// Loads the next page (whichever ya previously loaded)

// GET:/subscriptions/Subscribe?url={someUrl}
// Subscribes ya to a channel

// POST:/subscriptions/SubscribeOverride
// Body: new-line seperated list of urls
// Deletes all subscriptions, clears cache, and subscirbes to all provided channels

// GET:/subscriptions/FillCache5000
// Fills the cache with subscription results till it got atleast 5000 new items.

// Channel

// GET:/platform/Channel?url={channelUrl}
// Returns the channel object

// Sources

// GET:/sources/Sources
// Returns all configs of the available plugins

// GET:/sources/EnabledSources
// Returns all configs of the enabled plugins

// VideoDetail

// GET:/details/ContentDetails?url={videoUrl}
// Returns the video details of given url

// Subscription videos global variable
const [subVideos, setSubVideos] = createGlobalSignal<PlatformVideo[]>([])
export const getSubVideos = subVideos

/**
 * A promise that fulfills when subscribed videos are populated from persistent storage
 */
// const hydratedSubVideos = fetchEndpoint('/subscriptions/SubscriptionsLoadCache').then(
//   setSubVideos
// )

/**
 * Refresh subscribed videos starting at page 1
 */
export const refreshSubVideos = async () => {
  // await hydratedSubVideos
  const videos = await fetchEndpoint('/subscriptions/SubscriptionsLoad')
  setSubVideos(videos)
}
