import { createVirtualizer } from '@tanstack/solid-virtual'
import { formatDistanceToNowStrict } from 'date-fns'
import { formatNumber } from '@/services/format'
import './VideoList.css'
import { For, createEffect, createMemo, createSignal, onCleanup } from 'solid-js'

// TODO some titles are overflowing

const GAP_SIZE = 30

// Row virtualizer with dynamic item size
function VideoList(props: {
  videos: any[]
  hasNextPage?: boolean
  fetchNextPage?: () => Promise<void>
}) {
  let containerRef: HTMLElement | null = null

  const [rowHeight, setRowHeight] = createSignal(0)
  const [firstRowRef, setFirstRowRef] = createSignal<HTMLElement | null>(null)
  const [fetchingNextPage, setFetchingNextPage] = createSignal(false)

  const numColumns = 4

  const numRows = createMemo(() => Math.ceil(props.videos.length / numColumns))

  // Observe height of first row on resize
  createEffect(() => {
    if (firstRowRef()) {
      const observer = new ResizeObserver(([{ target }]) => {
        const height = (target as HTMLDivElement).offsetHeight
        if (height) {
          setRowHeight(height)
        }
      })
      observer.observe(firstRowRef()!)
      onCleanup(() => observer.disconnect())
    }
  })

  // Create virtualizer
  const virtualizer = createMemo(() => {
    const height = rowHeight() + GAP_SIZE
    return createVirtualizer({
      getScrollElement: () => containerRef,
      count: numRows() + (props.hasNextPage ? 1 : 0),
      estimateSize: () => height,
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
    <div ref={(el) => (containerRef = el)}>
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
                <div class="videoRow" style={{ '--column-count': numColumns }}>
                  <For each={videoRow}>
                    {(vid: PlatformVideo) => (
                      <a
                        href={`/watch?url=${encodeURIComponent(vid.url)}`}
                        ref={(el) => index === 0 && setFirstRowRef(el)}
                        class="item"
                        style={{
                          'flex-basis': ['100%', '50%', '33.333%', '25%', '20%', '16.666%'][
                            numColumns - 1
                          ],
                        }}
                      >
                        <img class="imageUrl" src={vid.thumbnails.sources.slice(-1)[0].url} />
                        <div class="metadata">
                          {/* <img class="authorImageUrl" src={vid.author.thumbnail} /> */}

                          <div class="metadata-right">
                            <div class="title">{vid.name}</div>
                            <div class="small-metadata">{vid.author.name}</div>
                            <div class="small-metadata">
                              {formatNumber(vid.viewCount)} views •
                              {formatDistanceToNowStrict(new Date(vid.datetime * 1000))} ago
                            </div>
                          </div>
                        </div>
                      </a>
                    )}
                  </For>
                </div>
              )
            }}
          </For>
        </div>
      </div>
    </div>
  )
}

export default VideoList
