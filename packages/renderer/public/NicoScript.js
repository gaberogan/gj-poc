const PLATFORM = 'Niconico'
const PLATFORM_CLAIMTYPE = 21

const URL_RECOMMENDED_FEED =
  'https://nvapi.nicovideo.jp/v1/recommend?recipeId=video_recommendation_recommend&sensitiveContents=mask&site=nicovideo&_frontendId=6&_frontendVersion=0'

// Docs: https://site.nicovideo.jp/search-api-docs/snapshot
const URL_SEARCH =
  'https://api.search.nicovideo.jp/api/v2/snapshot/video/contents/search?targets=title,description,tags&fields=contentId,title,userId,viewCounter,lengthSeconds,thumbnailUrl,startTime&_sort=-viewCounter&_offset=0&_limit=20&_context=app-d39af5e3e5bb'
const URL_COMMENTS = 'https://nv-comment.nicovideo.jp/v1/threads'
const URL_FOLLOWING = 'https://nvapi.nicovideo.jp/v1/users/me/following/users?pageSize=100'
const URL_PLAYLISTS = 'https://nvapi.nicovideo.jp/v1/users/me/mylists'

const NICO_VIDEO_URL_REGEX = /.*nicovideo.jp\/watch\/(.*)/
const NICO_CHANNEL_URL_REGEX = /.*nicovideo.jp\/user\/(.*)/
const NICO_PLAYLIST_URL_REGEX = /.*nicovideo.jp\/my\/mylist\/(.*)/

let config = {}

//#region Plugin Hooks

source.enable = function (conf) {
  config = conf ?? {}
  //log(config);
}

source.getHome = function () {
  class RecommendedVideoPager extends VideoPager {
    constructor({ videos = [], hasMore = true, context = {} } = {}) {
      super(videos, hasMore, context)
    }

    nextPage() {
      const res = http.GET(URL_RECOMMENDED_FEED, {}, bridge.isLoggedIn())

      if (!res.isOk) {
        throw new ScriptException(`Failed request [${URL_RECOMMENDED_FEED}] (${res.code})`)
      }

      const nicoVideos = JSON.parse(res.body).data.items.map((x) => x.content)
      const platformVideos = nicoVideos.map(nicoVideoToPlatformVideo)

      return new RecommendedVideoPager({
        videos: platformVideos,
        hasMore: false,
      })
    }
  }

  return new RecommendedVideoPager().nextPage()
}

source.searchSuggestions = function (query) {
  const url = `https://sug.search.nicovideo.jp/suggestion/expand/${query}`
  const res = http.GET(url, {})

  if (!res.isOk) {
    throw new ScriptException(`Failed request [${url}] (${res.code})`)
  }

  const suggestions = JSON.parse(res.body).candidates

  return suggestions
}

source.getSearchCapabilities = () => {
  return { types: [Type.Feed.Mixed], sorts: [], filters: [] }
}

source.search = function (query) {
  class SearchVideoPager extends VideoPager {
    constructor({ videos = [], hasMore = true, context = {} } = {}) {
      super(videos, hasMore, context)
    }

    nextPage() {
      const res = http.POST(URL_SEARCH, `q=${encodeURIComponent(query)}`, {
        'Content-Type': 'application/x-www-form-urlencoded',
      })

      if (!res.isOk) {
        throw new ScriptException(`Failed request [${URL_SEARCH}] (${res.code})`)
      }

      const nicoVideos = JSON.parse(res.body).data
      const platformVideos = nicoVideos.map(nicoSearchVideoToPlatformVideo)

      return new SearchVideoPager({ videos: platformVideos, hasMore: false })
    }
  }

  return new SearchVideoPager().nextPage()
}

source.getContentDetails = function (videoUrl) {
  const videoId = getVideoIdFromUrl(videoUrl)
  // Docs: https://w.atwiki.jp/nicoapi/pages/16.html
  const getThumbInfoUrl = `https://ext.nicovideo.jp/api/getthumbinfo/${videoId}`

  // For video details in XML format
  const [videoXMLRes, videoHTMLRes] = batchRequest([
    {
      url: getThumbInfoUrl,
    },
    {
      url: videoUrl,
    },
  ])

  if (!videoXMLRes.isOk) {
    throw new ScriptException(`Failed request [${getThumbInfoUrl}] (${videoXMLRes.code})`)
  }

  if (!videoHTMLRes.isOk) {
    throw new ScriptException(`Failed request [${videoUrl}] (${videoHTMLRes.code})`)
  }

  const videoXML = videoXMLRes.body
  const videoHTML = videoHTMLRes.body

  // The HLS endpoint needs to be fetched separately
  const { actionTrackId, accessRightKey } = getCSRFTokensFromVideoDetailHTML(videoHTML)
  // TODO Need to pass cookies to ExoPlayer for HLS stream to work, use dummy stream for now
  // const hlsEndpoint = fetchHLSEndpoint({ videoId, actionTrackId, accessRightKey });
  const hlsEndpoint = 'http://sample.vodobox.net/skate_phantom_flex_4k/skate_phantom_flex_4k.m3u8'

  const platformVideo = nicoVideoDetailsToPlatformVideoDetails({
    videoXML,
    hlsEndpoint,
  })

  return platformVideo
}

source.isContentDetailsUrl = function (url) {
  return NICO_VIDEO_URL_REGEX.test(url)
}

source.getComments = function (videoUrl) {
  const videoHTMLRes = http.GET(videoUrl, {})

  if (!videoHTMLRes.isOk) {
    throw new ScriptException(`Failed request [${videoUrl}] (${videoHTMLRes.code})`)
  }

  // Need data embedded in video HTML to make comments request
  const encodedPageData = /data-api-data="(.*?)"/.exec(videoHTMLRes.body)?.[1] || ''
  const pageData = JSON.parse(encodedPageData.replace(/&quot;/g, '"'))

  const videoCommentsRes = http.POST(
    URL_COMMENTS,
    JSON.stringify({
      params: pageData.comment.nvComment.params,
      threadKey: pageData.comment.nvComment.threadKey,
      additionals: {},
    }),
    {
      'x-frontend-id': '6',
    }
  )

  if (!videoCommentsRes.isOk) {
    throw new ScriptException(`Failed request [${URL_COMMENTS}] (${videoCommentsRes.code})`)
  }

  const nicoComments =
    JSON.parse(videoCommentsRes.body).data.threads.find((x) => x.fork === 'main')?.comments || []

  const comments = nicoComments.map((comment) => {
    return new Comment({
      contextUrl: videoUrl,
      author: new PlatformAuthorLink(
        new PlatformID(PLATFORM, comment.id, config.id, PLATFORM_CLAIMTYPE),
        '', // Does not exist on comments endpoint
        `https://www.nicovideo.jp/user/${comment.userId}`,
        '' // Does not exist on comments endpoint
      ),
      message: comment.body,
      rating: new RatingLikes(comment.score),
      date: dateToUnixSeconds(comment.postedAt),
      replyCount: 0, // Does not exist
    })
  })

  // Reverse comments for proper date order
  return new CommentPager(comments.toReversed(), false)
}

// Does not exist
// source.getSubComments = function (comment) {};

// Does not exist
// source.getSearchChannelContentsCapabilities = function () {}

// Does not exist
// source.searchChannelContents = function (channelUrl, query, type, order, filters) {}

// Does not exist
// source.searchChannels = function (query) {}

source.isChannelUrl = function (url) {
  return NICO_CHANNEL_URL_REGEX.test(url)
}

source.getChannel = function (url) {
  const res = http.GET(url, {})

  if (!res.isOk) {
    throw new ScriptException(`Failed request [${url}] (${res.code})`)
  }

  const user = getUserDataFromHTML(res.body)
  return new PlatformChannel({
    id: new PlatformID(PLATFORM, String(user.id), config.id, PLATFORM_CLAIMTYPE),
    name: user.nickname,
    thumbnail: user.icons?.large,
    banner: user.coverImage?.smartphoneUrl,
    subscribers: user.followerCount || 0,
    description: unescapeHtmlEntities(user.strippedDescription),
    url,
    // Not implemented in-app
    links: user.sns.map((social) => social.url) || [],
  })
}

source.getChannelContents = function (channelUrl) {
  class ChannelVideoPager extends VideoPager {
    constructor({ videos = [], hasMore = true, context = {} } = {}) {
      super(videos, hasMore, context)
    }

    nextPage() {
      const userId = getUserIdFromURL(channelUrl)
      const searchUrl = `https://nvapi.nicovideo.jp/v3/users/${userId}/videos?sortKey=registeredAt&sortOrder=desc&sensitiveContents=mask&pageSize=100&page=1`
      const res = http.GET(searchUrl, {
        'X-Frontend-Id': '6',
      })

      if (!res.isOk) {
        throw new ScriptException(`Failed request [${searchUrl}] (${res.code})`)
      }

      const nicoVideos = JSON.parse(res.body).data.items.map((x) => x.essential)
      const platformVideos = nicoVideos.map(nicoVideoToPlatformVideo)

      return new ChannelVideoPager({
        videos: platformVideos,
        hasMore: false,
      })
    }
  }

  return new ChannelVideoPager().nextPage()
}

source.isPlaylistUrl = (url) => {
  return NICO_PLAYLIST_URL_REGEX.test(url)
}

// TODO Getting a "Failed to fetch" error on device but getPlaylist runs fine on device, bug in GrayJay??
source.getPlaylist = (playlistUrl) => {
  const playlistId = getPlaylistIdFromURL(playlistUrl)
  const playlistApiUrl = `https://nvapi.nicovideo.jp/v1/users/me/mylists/${playlistId}?pageSize=100&page=1`

  if (!bridge.isLoggedIn()) {
    bridge.log('Failed to retrieve playlist, not logged in.')
    return null
  }

  const [playlistHttpRes, playlistApiRes] = batchRequest([
    {
      url: playlistUrl,
      headers: { 'X-Frontend-Id': '6' },
      auth: true,
    },
    {
      url: playlistApiUrl,
      headers: { 'X-Frontend-Id': '6' },
      auth: true,
    },
  ])

  if (!playlistHttpRes.isOk) {
    throw new ScriptException(`Failed request [${playlistUrl}] (${playlistHttpRes.code})`)
  }

  if (!playlistApiRes.isOk) {
    throw new ScriptException(`Failed request [${playlistApiUrl}] (${playlistApiRes.code})`)
  }

  const nicoPlaylist = JSON.parse(playlistApiRes.body).data.mylist
  const platformVideos = nicoPlaylist.items.map((x) => x.video).map(nicoVideoToPlatformVideo)

  // Get user from embedded HTML
  const encodedPageData = /data-common-header="(.*?)"/.exec(playlistHttpRes.body)?.[1] || ''
  const pageData = JSON.parse(encodedPageData.replace(/&quot;/g, '"'))
  const user = pageData.initConfig.user

  return new PlatformPlaylistDetails({
    url: playlistUrl,
    id: new PlatformID(PLATFORM, playlistId, config.id),
    author: new PlatformAuthorLink(
      new PlatformID(PLATFORM, user.id, config.id, PLATFORM_CLAIMTYPE),
      user.nickname,
      `https://www.nicovideo.jp/user/${user.id}`,
      user.iconUrl
    ),
    name: nicoPlaylist.name,
    thumbnail: null,
    videoCount: platformVideos.length,
    contents: new VideoPager(platformVideos, false),
  })
}

source.getUserPlaylists = () => {
  if (!bridge.isLoggedIn()) {
    bridge.log('Failed to retrieve playlists, not logged in.')
    return []
  }

  const res = http.GET(URL_PLAYLISTS, { 'X-Frontend-Id': '6' }, true)

  if (!res.isOk) {
    throw new ScriptException(`Failed request [${URL_PLAYLISTS}] (${res.code})`)
  }

  const playlistUrls = JSON.parse(res.body).data.mylists.map(
    (playlist) => `https://www.nicovideo.jp/my/mylist/${playlist.id}`
  )

  return playlistUrls
}

source.getUserSubscriptions = () => {
  if (!bridge.isLoggedIn()) {
    bridge.log('Failed to retrieve subscriptions, not logged in.')
    return []
  }

  const res = http.GET(
    URL_FOLLOWING,
    {
      'X-Frontend-Id': '6',
    },
    true
  )

  if (!res.isOk) {
    throw new ScriptException(`Failed request [${URL_FOLLOWING}] (${res.code})`)
  }

  const followingUrls = JSON.parse(res.body).data.items.map((x) => {
    return `https://www.nicovideo.jp/user/${x.id}`
  })

  return followingUrls
}

//#endregion

//#region Parsing

function nicoVideoDetailsToPlatformVideoDetails({ videoXML, hlsEndpoint }) {
  // Helper function
  const queryVideoXML = (tag) => querySelectorXML(videoXML, tag)

  const videoId = queryVideoXML('video_id')
  const thumbnailUrl = queryVideoXML('thumbnail_url')
  const duration = hhmmssToDuration(queryVideoXML('length'))
  const videoUrl = queryVideoXML('watch_url')
  const authorId = queryVideoXML('user_id')

  // Closest thing to likes
  const mylistBookmarks = Number(queryVideoXML('mylist_counter'))

  // TODO Cannot support delivery.domand.nicovideo.jp yet because Exoplayer must send a domand_bid cookie
  // with each request, this comes from Set-Cookie from the /access-rights endpoint
  if (hlsEndpoint.includes('delivery.domand.nicovideo.jp')) {
    throw new UnavailableException('Niconico videos from "Domand" are not yet supported.')
  }

  return new PlatformVideoDetails({
    id: videoId && new PlatformID(PLATFORM, videoId, config.id, PLATFORM_CLAIMTYPE),
    name: queryVideoXML('title'),
    thumbnails: thumbnailUrl && new Thumbnails([new Thumbnail(thumbnailUrl, 0)]),
    duration,
    viewCount: Number(queryVideoXML('view_counter')),
    url: videoUrl,
    isLive: false,
    uploadDate: dateToUnixSeconds(queryVideoXML('first_retrieve')),
    shareUrl: videoUrl,
    author: new PlatformAuthorLink(
      new PlatformID(PLATFORM, authorId, config.id, PLATFORM_CLAIMTYPE),
      queryVideoXML('user_nickname'),
      `https://www.nicovideo.jp/user/${authorId}`,
      queryVideoXML('user_icon_url')
    ),
    description: unescapeHtmlEntities(queryVideoXML('description')),
    rating: new RatingLikes(mylistBookmarks),
    subtitles: [],
    video: new VideoSourceDescriptor([
      new HLSSource({
        name: 'Original',
        url: hlsEndpoint,
        duration,
      }),
    ]),
  })
}

function nicoSearchVideoToPlatformVideo(v) {
  const videoUrl = `https://www.nicovideo.jp/watch/${v.contentId}`
  const authorId = String(v.userId)

  return new PlatformVideo({
    id: v.contentId && new PlatformID(PLATFORM, v.contentId, config.id, PLATFORM_CLAIMTYPE),
    name: v.title,
    thumbnails: v.thumbnailUrl && new Thumbnails([new Thumbnail(v.thumbnailUrl, 0)]),
    duration: v.lengthSeconds,
    viewCount: v.viewCounter,
    url: videoUrl,
    isLive: false,
    uploadDate: dateToUnixSeconds(v.startTime),
    shareUrl: videoUrl,
    author: new PlatformAuthorLink(
      new PlatformID(PLATFORM, authorId, config.id, PLATFORM_CLAIMTYPE),
      'ニコニコ',
      `https://www.nicovideo.jp/user/${authorId}`,
      'https://play-lh.googleusercontent.com/_C1KxgGIw43g2Y2G8salrswvYqkkBum5896cCrFOWkgdAxZI10efI-oQxfWRfLOBysE'
    ),
  })
}

function nicoVideoToPlatformVideo(v) {
  const videoUrl = `https://www.nicovideo.jp/watch/${v.id}`
  const thumbnailUrl = v.thumbnail.listingUrl

  return new PlatformVideo({
    id: v.id && new PlatformID(PLATFORM, v.id, config.id, PLATFORM_CLAIMTYPE),
    name: v.title,
    thumbnails: thumbnailUrl && new Thumbnails([new Thumbnail(thumbnailUrl, 0)]),
    duration: v.duration,
    viewCount: v.count.view,
    url: videoUrl,
    isLive: false,
    uploadDate: dateToUnixSeconds(v.registeredAt),
    shareUrl: videoUrl,
    author: new PlatformAuthorLink(
      new PlatformID(PLATFORM, v.owner.id, config.id, PLATFORM_CLAIMTYPE),
      v.owner.name,
      `https://www.nicovideo.jp/user/${v.owner.id}`,
      v.owner.iconUrl
    ),
  })
}

function getUserDataFromHTML(html) {
  const encodedPageData = /data-initial-data="(.*?)"/.exec(html)?.[1] || ''
  const userPageData = JSON.parse(encodedPageData.replace(/&quot;/g, '"'))
  const userObj = userPageData?.state?.userDetails?.userDetails?.user
  return userObj
}

function getCSRFTokensFromVideoDetailHTML(html) {
  const encodedPageData = /data-api-data="(.*?)"/.exec(html)?.[1] || ''
  const pageData = JSON.parse(encodedPageData.replace(/&quot;/g, '"'))

  // For getting actionTrackId and X-Access-Right-Key from the DOM, required for HLS requests
  const actionTrackId = pageData.client.watchTrackId
  const accessRightKey = pageData.media.domand.accessRightKey

  if (!actionTrackId || !accessRightKey) {
    throw new ScriptException(`Unable to play video, could not get CSRF tokens.`)
  }

  return { actionTrackId, accessRightKey }
}

function fetchHLSEndpoint({ videoId, actionTrackId, accessRightKey }) {
  const url = `https://nvapi.nicovideo.jp/v1/watch/${videoId}/access-rights/hls?actionTrackId=${actionTrackId}`

  // This gives us the video/audio configurations we are allowed to request
  const jwt = parseJWT(accessRightKey)
  const videoOptions = jwt.v
  const audioOptions = jwt.a

  const res = http.POST(
    url,
    JSON.stringify({
      outputs: videoOptions.map((option) => [option, audioOptions[0]]),
    }),
    {
      'X-Access-Right-Key': accessRightKey,
      'X-Frontend-Id': '6',
      'X-Frontend-Version': '0',
      'X-Request-With': 'https://www.nicovideo.jp',
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: '*/*',
    }
  )

  if (!res.isOk) {
    throw new ScriptException(`Failed request [${url}] (${res.code})`)
  }

  const hlsEndpoint = JSON.parse(res.body)?.data?.contentUrl

  // Every part of the request was validated, not sure why we're getting a 400
  if (!hlsEndpoint) {
    throw new ScriptException(`Failed request [${url}] (${res.code})`)
  }

  return hlsEndpoint
}

//#endregion

//#region Utility

/**
 * Convert a Date to a unix time stamp
 * @param {string} date Date to convert
 * @returns {Number?} Unix time stamp
 */
function dateToUnixSeconds(date) {
  if (!date) {
    return null
  }

  return Math.round(Date.parse(date) / 1000)
}

/**
 * Gets the video id from an URL
 * @param {String?} url The URL
 * @returns {String?} The video id
 */
function getVideoIdFromUrl(url) {
  if (!url) {
    return null
  }

  const match = NICO_VIDEO_URL_REGEX.exec(url)
  return match ? match[1] : null
}

/**
 * Gets the user id from an URL
 * @param {String?} url The URL
 * @returns {String?} The user id
 */
function getUserIdFromURL(url) {
  if (!url) {
    return null
  }

  const match = NICO_CHANNEL_URL_REGEX.exec(url)
  return match ? match[1] : null
}

/**
 * Gets the playlist id from an URL
 * @param {String?} url The URL
 * @returns {String?} The playlist id
 */
function getPlaylistIdFromURL(url) {
  if (!url) {
    return null
  }

  const match = NICO_PLAYLIST_URL_REGEX.exec(url)
  return match ? match[1] : null
}

/**
 * Unescape common HTML entities without using DOMParser
 * @param {string} htmlString
 * @returns {string} Unescaped string
 */
function unescapeHtmlEntities(htmlString) {
  return htmlString
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

/**
 * Format a duration string to a duration in seconds
 * @param {string?} durationStr Duration string format (hh:mm:ss)
 * @returns {Number?} Duration in seconds
 */
function hhmmssToDuration(durationStr) {
  if (!durationStr) {
    return null
  }

  const parts = durationStr.split(':').map(Number)

  if (parts.some(isNaN)) {
    return null
  }

  if (parts.length == 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length == 2) {
    return parts[0] * 60 + parts[1]
  } else if (parts.length == 1) {
    return parts[0]
  }

  return null
}

/**
 * Get text inside an XML tag
 * @param {String?} xml XML document string
 * @param {String?} tag XML tag to search for
 * @returns {String?} Text inside XML tag
 */
function querySelectorXML(xml, tag) {
  const xmlRegex = new RegExp(`<${tag}>(.*?)</${tag}>`, 'g')
  const innerText = xmlRegex.exec(xml)
  return innerText?.[1] || null
}

/**
 * Parse Base64 encoded JWT
 * @param {String} jwt Base64 encoded JWT
 * @returns {Object} Decoded JWT JSON
 */
function parseJWT(jwt) {
  return JSON.parse(base64ToAscii(jwt.split('.')[1]))
}

/**
 * Base64 to ASCII (from ChatGPT)
 * @param {String} base64String Base64 encoded string
 * @returns {String} ASCII string
 */
function base64ToAscii(base64String) {
  const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='

  let decoded = ''
  let buffer = 0
  let bufferLength = 0

  for (let i = 0; i < base64String.length; i++) {
    const charIndex = base64Chars.indexOf(base64String.charAt(i))

    if (charIndex === -1) {
      // Skip invalid characters
      continue
    }

    buffer = (buffer << 6) | charIndex
    bufferLength += 6

    if (bufferLength >= 8) {
      bufferLength -= 8
      const charCode = (buffer >> bufferLength) & 0xff
      decoded += String.fromCharCode(charCode)
    }
  }

  return decoded
}

/**
 * Make batch HTTP requests simpler
 * @param {any[]} requests e.g. [{ url: '...', method: 'GET', headers: '...', body: '...', auth: true }]
 * @returns {any} responses e.g. [{ body: '...', isOk: true }, ...]
 */
function batchRequest(requests) {
  let batch = http.batch()

  for (const request of requests) {
    if (!request.url) {
      throw new ScriptException('An HTTP request must have a URL')
    }

    if (!request.body) {
      batch = batch.request(
        request.method || 'GET',
        request.url,
        request.headers || {},
        request.auth || false
      )
    } else {
      batch = batch.requestWithBody(
        request.method || 'GET',
        request.url,
        request.body,
        request.headers || {},
        request.auth || false
      )
    }
  }

  return batch.execute()
}

//#endregion

log('LOADED')
