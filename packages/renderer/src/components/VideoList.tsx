import { createVirtualizer } from '@tanstack/solid-virtual'
import { formatDistanceToNowStrict } from 'date-fns'
import { formatNumber } from '@/services/format'
import { For, createEffect, createMemo, createSignal, onCleanup } from 'solid-js'
import { css } from '@emotion/css'

const GAP_SIZE = 30

// Row virtualizer with dynamic item size
function VideoList(props: {
  videos: any[]
  hasNextPage?: boolean
  fetchNextPage?: () => Promise<void>
}) {
  let containerRef: HTMLElement | null = null

  const [rowHeight, setRowHeight] = createSignal(0)
  const [rowWidth, setRowWidth] = createSignal(0)
  const [firstRowRef, setFirstRowRef] = createSignal<HTMLElement | null>(null)
  const [fetchingNextPage, setFetchingNextPage] = createSignal(false)

  const numColumns = createMemo(() => Math.max(1, Math.floor(rowWidth() / 300)))
  const numRows = createMemo(() => Math.ceil(props.videos.length / numColumns()))

  // Observe height of first row on resize
  createEffect(() => {
    if (firstRowRef()) {
      const observer = new ResizeObserver(([{ target }]) => {
        const height = (target as HTMLDivElement).offsetHeight
        const width = target.parentElement!.offsetWidth
        if (height) {
          setRowHeight(height)
          setRowWidth(width)
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
      setFetchingNextPage(true)
      await props.fetchNextPage?.()
      setFetchingNextPage(false)
    }
  })

  return (
    <div ref={(el) => (containerRef = el)} style={{ height: '100%', 'overflow-y': 'scroll' }}>
      <div
        style={{
          height: virtualizer().getTotalSize() + 'px',
          position: 'relative',
        }}
      >
        <div
          class={style}
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

              const startIndex = index * numColumns()
              const videoRow = props.videos.slice(startIndex, startIndex + numColumns())
              return (
                <div class="videoRow" style={{ '--column-count': numColumns() }}>
                  <For each={videoRow}>
                    {(vid: PlatformVideo) => (
                      <a
                        href={`/watch?url=${encodeURIComponent(vid.url)}`}
                        ref={(el) => index === 0 && setFirstRowRef(el)}
                        class="item"
                      >
                        <img
                          crossorigin=""
                          class="imageUrl"
                          src={vid.thumbnails.sources.slice(-1)[0].url}
                        />
                        <div class="metadata">
                          <img crossorigin="" class="authorImageUrl" src={vid.author.thumbnail} />
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

const style = css`
  .videoRow {
    display: grid;
    grid-template-columns: repeat(var(--column-count), 1fr);
    grid-template-rows: 1fr;
    gap: 16px;
  }

  .item {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    position: relative;
    height: 100%;
    font-size: 16px;
  }

  .metadata {
    overflow: hidden; // TODO title cuts off, but overflows without this
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .metadata-right {
    display: flex;
    flex-direction: column;
  }

  .title {
    line-height: 1.3em;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    max-width: 100%;
  }

  .small-metadata {
    line-height: 1.4em;
    font-size: 14px;
    color: #aaa;
  }

  .imageUrl {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
  }

  .authorImageUrl {
    width: 36px;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 100px;
  }
`
