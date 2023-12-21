import _ from 'lodash'

export const fetchText = (...args: Parameters<typeof fetch>) => {
  return fetch(...args).then((res) => res.text())
}

export const fetchJSON = (...args: Parameters<typeof fetch>) => {
  return fetch(...args).then((res) => res.json())
}

export const fetchTextMemo = _.memoize(fetchText)

export const fetchJSONMemo = _.memoize(fetchJSON)
