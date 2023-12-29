export {}

declare global {
  interface Window {
    // Expose some Api through preload script
  }

  const process: {
    env: { [key: string]: string } & {
      npm_package_version: string
    }
  }

  interface PlatformVideo {
    id: {
      value: string
    }
    thumbnails: {
      sources: {
        quality: number
        url: string
      }[]
    }
    datetime: number
    duration: number
    name: string
    url: string
    viewCount: number
    author: {
      id: {
        value: string
      }
      name: string
      thumbnail: string
      url: string
    }
    fetchedAt: number // Added by us
  }
}
