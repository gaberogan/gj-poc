import { createWindowVirtualizer } from '@tanstack/solid-virtual'
import { formatDistanceToNowStrict } from 'date-fns'
import { formatNumber } from '@/services/format'
import './VideoList.css'
import { For, createMemo } from 'solid-js'

type Video = Readonly<{
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
}>

// Row virtualizer with dynamic item size
function VideoList(props: { videos: any[] }) {
  const numColumns = 4

  const virtualizer = createMemo(() => {
    return createWindowVirtualizer({
      count: Math.ceil(props.videos.length / numColumns),
      estimateSize: () => 300,
      overscan: 5,
    })
  })

  return (
    <div
      style={{
        height: virtualizer().getTotalSize() + 'px',
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
          transform: `translateY(${virtualizer().getVirtualItems()[0]?.start ?? 0}px)`,
          display: 'flex',
          'flex-direction': 'column',
          gap: 30 + 'px',
        }}
      >
        <For each={virtualizer().getVirtualItems()}>
          {({ index }: any) => {
            const startIndex = index * numColumns
            const videoRow = props.videos.slice(startIndex, startIndex + numColumns)
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
                      <img class="imageUrl" src={vid.thumbnails.sources.slice(-1)[0].url} />
                      <div class="metadata">
                        <img class="authorImageUrl" src={vid.author.thumbnail} />

                        <div class="metadata-right">
                          <div class="title">{vid.name}</div>
                          <div class="small-metadata">{vid.author.name}</div>
                          <div class="small-metadata">
                            {formatNumber(vid.viewCount)} views •
                            {formatDistanceToNowStrict(new Date(vid.datetime * 1000))} ago
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
