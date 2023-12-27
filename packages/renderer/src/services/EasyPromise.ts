export class EasyPromise<T = unknown> extends Promise<T> {
  isResolved = false
  resolve: (value?: T) => EasyPromise<T>

  constructor(
    executor: (
      resolve: (value: T | PromiseLike<T>) => void,
      reject: (reason?: any) => void
    ) => void = () => {}
  ) {
    let resolveCallback: (value: T | PromiseLike<T>) => void

    super((resolve, reject) => {
      resolveCallback = resolve
      executor(resolve, reject)
    })

    this.resolve = (value) => {
      if (!this.isResolved) {
        resolveCallback?.(value as T)
        this.isResolved = true
      }

      return this
    }
  }
}
