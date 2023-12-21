import { deleteDB, openDB } from 'idb'

// TODO Ensure only the user can clear the DB, never the browser
// navigator.storage.persist()

// Function to create the database and table
async function createSubscriptionCache() {
  await deleteDB('subscription_cache_db')
  const db = await openDB('subscription_cache_db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('subscription_cache')) {
        const store = db.createObjectStore('subscription_cache', { keyPath: 'url' })
        store.createIndex('channelUrlIndex', 'channelUrl')
        store.createIndex('uploadTimeIndex', 'uploadTime')
      }
    },
  })

  return db
}

// // Example usage
// async function main() {
//   const db = await createSubscriptionCache()

//   // const video = {
//   //   url: 'https://example.com/1',
//   //   channelUrl: 'https://channel.example.com',
//   //   uploadTime: 1000,
//   //   json: { example: 'data' },
//   // }

//   // await db.put('subscription_cache', video)

//   // Query data and sort by uploadTime in descending order
//   const result = await db.getAllFromIndex('subscription_cache', 'uploadTimeIndex', null, 100)
//   const value = result.reverse()
//   console.log(value)
// }

// main()
