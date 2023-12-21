import { createWindowVirtualizer } from '@tanstack/solid-virtual'
import { formatDistanceToNowStrict } from 'date-fns'
import { formatNumber } from '@/services/format'
import './VideoList.css'
import { For } from 'solid-js'

type Video = {
  readonly id: string
  readonly imageUrl: string
  readonly uploadDate: string
  readonly duration: number
  readonly title: string
  readonly url: string
  readonly views: number
  readonly authorName: string
  readonly authorImageUrl: string
}

const data = await fetch('/CNN_Videos.json').then((x) => x.json())

const videos = data.slice(0, 9000).map(
  (vid: any) =>
    ({
      id: vid.ID.Value,
      imageUrl: vid.Thumbnails.Sources.slice(-1)[0].Url,
      uploadDate: vid.DateTime,
      duration: vid.Duration,
      title: vid.Name,
      url: vid.Url,
      views: vid.ViewCount,
      authorName: vid.Author.Name,
      authorImageUrl: vid.Author.Thumbnail,
    } as Video)
)

// Row virtualizer with dynamic item size
function VideoList() {
  const numColumns = 4

  const numRows = Math.ceil(videos.length / numColumns)

  const virtualizer = createWindowVirtualizer({
    count: numRows,
    estimateSize: () => 300,
    overscan: 5,
  })

  const virtualRows = virtualizer.getVirtualItems()

  return (
    <div
      style={{
        height: virtualizer.getTotalSize() + 'px',
        position: 'relative',
        margin: 24 + 'px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          transform: `translateY(${virtualRows[0]?.start ?? 0}px)`,
          display: 'flex',
          'flex-direction': 'column',
          gap: 30 + 'px',
        }}
      >
        <For each={virtualRows}>
          {({ index }: any) => {
            const videoRow = videos.slice(index, index + numColumns)
            return (
              <div class="videoRow">
                <For each={videoRow}>
                  {(vid: Video) => (
                    <div
                      class="item"
                      style={{
                        'flex-basis': ['100%', '50%', '33.333%', '25%', '20%', '16.666%'][
                          numColumns - 1
                        ],
                      }}
                    >
                      <img class="imageUrl" src={vid.imageUrl} />
                      <div class="metadata">
                        <img class="authorImageUrl" src={vid.authorImageUrl} />

                        <div class="metadata-right">
                          <div class="title">{vid.title}</div>
                          <div class="small-metadata">{vid.authorName}</div>
                          <div class="small-metadata">
                            {formatNumber(vid.views)} views •
                            {formatDistanceToNowStrict(new Date(vid.uploadDate))} ago
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            )
          }}
        </For>
      </div>
    </div>
  )
}

export default VideoList
