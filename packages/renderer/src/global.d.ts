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
    video: {
      videoSources: {
        bitrate: number
        codec: string
        container: string
        duration: number
        height: number
        indexEnd: number
        indexStart: number
        initEnd: number
        initStart: number
        itagId: number
        name: string
        plugin_type: string
        url: string
        width: number
      }[]
      audioSources: {
        audioChannels: number
        bitrate: number
        codec: string
        container: string
        duration: number
        indexEnd: number
        indexStart: number
        initEnd: number
        initStart: number
        itagId: number
        language: string
        name: string
        plugin_type: string
        url: string
      }[]
    }
    fetchedAt: number // Added by us
  }
}
