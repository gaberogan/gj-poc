export const sleep = (timeMs: number) => {
  return new Promise<void>((res) => {
    setTimeout(() => res(), timeMs)
  })
}

export const fetchText = (...args: Parameters<typeof fetch>) => {
  return fetch(...args).then((res) => res.text())
}

export const fetchJSON = (...args: Parameters<typeof fetch>) => {
  return fetch(...args).then((res) => res.json())
}
