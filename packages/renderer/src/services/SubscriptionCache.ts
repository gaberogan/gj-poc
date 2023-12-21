import { deleteDB, openDB } from 'idb'

const versionNumber = Number(process.env.npm_package_version.replaceAll('.', ''))

// Ensure only the user can clear the DB, never the browser
navigator.storage.persist()

// Uncomment to clear the database
// await deleteDB('subscription_cache_db')

const dbPromise = openDB('subscription_cache_db', versionNumber, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('subscription_cache')) {
      const store = db.createObjectStore('subscription_cache', { keyPath: 'url' })
      store.createIndex('authorUrlIndex', 'author.url')
      store.createIndex('datetimeIndex', 'datetime')
    }
  },
})

export const getSubscribedVideos = async () => {
  const db = await dbPromise
  const videos = (await db.getAllFromIndex('subscription_cache', 'datetimeIndex')).reverse()
  return videos.map((v) => v.json)
}

interface SubscriptionCacheVideo {
  url: string
  datetime: string
  author: {
    url: string
  }
}

export const setSubscribedVideos = async (videos: SubscriptionCacheVideo[]) => {
  const db = await dbPromise
  await Promise.all(
    await videos.map((video) => {
      return db.put('subscription_cache', video)
    })
  )
}

export const deletePlatformVideos = async (platformUrl: string) => {
  const db = await dbPromise
  const videos = await db.getAllKeys('subscription_cache')

  await Promise.all(
    videos.map((video) => {
      // TODO types?
      // @ts-ignore
      if (video.url.startsWith(platformUrl)) {
        // @ts-ignore
        return db.delete('subscription_cache', video.url)
      }
    })
  )
}
