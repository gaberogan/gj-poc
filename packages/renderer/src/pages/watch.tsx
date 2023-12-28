import { useSearchParams } from '@solidjs/router'

export default function Watch() {
  const [searchParams] = useSearchParams()

  console.log(searchParams.url)

  return (
    <section class="bg-pink-100 text-gray-700 p-8">
      <h1 class="text-2xl font-bold">Watch</h1>
    </section>
  )
}
