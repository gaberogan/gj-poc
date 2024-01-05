import { fetchText } from './fetch'

export const fetchChannels = async () =>
  (await fetchText('/channels.txt')).split('\n').filter((x) => x)
