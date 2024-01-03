export class EasyPromise<T = unknown> extends Promise<T> {
  isSettled = false
  resolve: (value?: T) => EasyPromise<T>
  reject: (reason?: any) => EasyPromise<T>

  constructor(
    executor: (
      resolve: (value: T | PromiseLike<T>) => void,
      reject: (reason?: any) => void
    ) => void = () => {}
  ) {
    let resolveCallback: (value: T | PromiseLike<T>) => void
    let rejectCallback: (reason?: any) => void

    super((resolve, reject) => {
      resolveCallback = resolve
      rejectCallback = reject
      executor(resolve, reject)
    })

    this.resolve = (value) => {
      if (!this.isSettled) {
        resolveCallback?.(value as T)
        this.isSettled = true
      }

      return this
    }

    this.reject = (reason) => {
      if (!this.isSettled) {
        rejectCallback?.(reason)
        this.isSettled = true
      }

      return this
    }
  }
}
