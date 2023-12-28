import { SignalOptions, createRoot, createSignal } from 'solid-js'

export const createGlobalSignal = <T>(value: T, options?: SignalOptions<T>) =>
  createRoot(() => createSignal<T>(value, options))

export const createStoredGlobalSignal = <T>(
  key: string,
  defaultValue?: T,
  options?: SignalOptions<T>
) =>
  createRoot(() => {
    const [getter, _setter] = createSignal<T>(getLocalStorage(key) ?? defaultValue ?? null, options)

    const setter = (value: Exclude<T, Function>) => {
      setLocalStorage(key, value)
      _setter(value)
    }

    return [getter, setter] as [typeof getter, typeof setter]
  })

const getLocalStorage = (key: string) => {
  const value = localStorage.getItem(key)
  return value ? JSON.parse(value) : null
}

const setLocalStorage = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value))
}
