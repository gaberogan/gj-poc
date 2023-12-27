import { createRoot, createSignal } from 'solid-js'

export const createGlobalSignal = <T>(...args: Parameters<typeof createSignal<T>>) =>
  createRoot(() => createSignal<T>(...args))
