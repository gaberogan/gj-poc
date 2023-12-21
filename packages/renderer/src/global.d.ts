export {}

declare global {
  interface Window {
    // Expose some Api through preload script
  }

  const process: {
    env: { [key: string]: string } & {
      npm_package_version: string
    }
  }
}
