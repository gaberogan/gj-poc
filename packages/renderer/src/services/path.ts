import path from 'path-browserify'

export const joinPathOrUrl = (...fileOrUrlPaths: string[]) => {
  const [urlOrPath, ...relativePaths] = fileOrUrlPaths

  if (urlOrPath.startsWith('http')) {
    const url = new URL(urlOrPath)
    url.pathname = path.join(path.dirname(url.pathname), ...relativePaths)
    return url.href
  } else {
    return path.join(path.dirname(urlOrPath), ...relativePaths)
  }
}
