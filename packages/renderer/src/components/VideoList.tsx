import { createWindowVirtualizer } from '@tanstack/solid-virtual'
import { formatDistanceToNowStrict } from 'date-fns'
import { formatNumber } from '@/services/format'
import './VideoList.css'
import { For, createEffect, createMemo, createSignal, onCleanup } from 'solid-js'

// TODO scrolling jank on fetch, some rows are shrunk

const GAP_SIZE = 30

// Row virtualizer with dynamic item size
function VideoList(props: {
  videos: any[]
  hasNextPage?: boolean
  fetchNextPage?: () => Promise<void>
}) {
  const [fetchingNextPage, setFetchingNextPage] = createSignal(false)

  const numColumns = 4

  const numRows = createMemo(() => Math.ceil(props.videos.length / numColumns))

  // Observe height of first row on resize
  let rowHeight = 0
  let firstRowRef: HTMLDivElement
  createEffect(async () => {
    if (props.videos.length) {
      const observer = new ResizeObserver(([{ target }]) => {
        const height = (target as HTMLDivElement).offsetHeight
        height && (rowHeight = height)
      })
      observer.observe(firstRowRef)
      onCleanup(() => observer.disconnect())
    }
  })

  // Create virtualizer
  const virtualizer = createMemo(() => {
    return createWindowVirtualizer({
      count: numRows() + (props.hasNextPage ? 1 : 0),
      estimateSize: () => rowHeight + GAP_SIZE,
      overscan: 1,
    })
  })

  // Fetch next page
  createEffect(async () => {
    const [lastRow] = virtualizer().getVirtualItems().slice(-1)
    if (lastRow?.index >= numRows() - 1 && props.hasNextPage && !fetchingNextPage()) {
      console.log('Fetching next page...')
      setFetchingNextPage(true)
      await props.fetchNextPage?.()
      setFetchingNextPage(false)
    }
  })

  return (
    <div
      style={{
        height: virtualizer().getTotalSize() + 'px',
        position: 'relative',
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
          gap: GAP_SIZE + 'px',
        }}
      >
        <For each={virtualizer().getVirtualItems()}>
          {({ index }: any) => {
            // Last row detects when we need to load more, optional spinner
            if (index > numRows() - 1) {
              return <div style={{ height: '180px' }} />
            }

            const startIndex = index * numColumns
            const videoRow = props.videos.slice(startIndex, startIndex + numColumns)
            return (
              <div class="videoRow">
                <For each={videoRow}>
                  {(vid: PlatformVideo) => (
                    <div
                      ref={(el) => index === 0 && (firstRowRef = el)}
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
