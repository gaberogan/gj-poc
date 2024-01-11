import _ from 'lodash'
import nodeFetch from 'node-fetch'

type Fetch<T = Response> = (url: string, options?: RequestInit) => Promise<T>

// Override window fetch to use authenticated fetch client
window.fetch = ((url, options = {}) => {
  const fullUrl = url.startsWith('/') ? window.location.origin + url : url
  return nodeFetch(fullUrl, options as any) as any
}) as Fetch as any

export const fetchText = (...args: Parameters<typeof fetch>) => {
  return fetch(...args).then((res) => res.text())
}

export const fetchJSON = (...args: Parameters<typeof fetch>) => {
  return fetch(...args).then((res) => res.json())
}

// TODO seems if called twice at same time it makes 2 calls

export const fetchTextMemo = _.memoize(fetchText)

export const fetchJSONMemo = _.memoize(fetchJSON)
