import * as store from 'idb-keyval'

// Function to set an item with TTL in seconds
async function set(key: string, value: any, ttlSeconds: number) {
  const expiration = Date.now() + ttlSeconds * 1000
  const item = { value, expiration }

  await store.set(key, item)
}

// Function to get an item and check for expiration
async function get(key: string) {
  const item = await store.get(key)

  if (item && item.expiration > Date.now()) {
    return item.value
  }

  // Item not found or expired
  return null
}

// Function to clean up expired keys
async function cleanupExpiredKeys() {
  const allEntries = await store.entries()

  for (const [key, item] of allEntries) {
    if (item.expiration <= Date.now()) {
      await store.del(key)
    }
  }
}

// Clean up expired keys on start and every hour
const cleanupInterval = 60 * 60 * 1000
cleanupExpiredKeys()
setInterval(cleanupExpiredKeys, cleanupInterval)

export default { get, set }
