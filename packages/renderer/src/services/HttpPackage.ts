import { VM, defineAsyncMethod, defineGlobalObject, defineMethod } from './quickjs'

interface BridgeHttpResponse {
  body: string
  code: number
  isOk: number // No boolean in QuickJS
}

const createHttpPackage = (vm: VM) => {
  // vm.arena.expose({
  //   http: {
  //     GET: () => {},
  //     batch: () => {
  //       const requests = []
  //       const batcher: any = {
  //         GET: (url: string, headers: { [key: string]: string }) => {
  //           requests.push({ url, headers })
  //           return batcher
  //         },
  //         // Can't define async code here that appears synchronous
  //         execute() {
  //           throw new Error('TODO')
  //         },
  //       }

  //       return batcher
  //     },
  //   },
  // })

  const httpHandle = defineGlobalObject(vm, 'http')

  defineMethod(vm, httpHandle, 'batch', () => {
    const requests = []

    const batcherHandle = vm.newObject()

    // Lifetime not active error
    const method = defineMethod(vm, batcherHandle, 'GET', (url, headers) => {
      requests.push({ url, headers })
      return batcherHandle
    })

    // defineMethod(vm, batcherHandle, 'execute', () => {
    //   throw new Error('TODO2')
    // })

    return batcherHandle
  })

  // Hidden HTTP API
  defineAsyncMethod(vm, httpHandle, 'GET', async (url, headers) => {
    const res = await fetch(url, { headers })
    const text = await res.text()
    const response = { body: text, code: res.status, isOk: res.ok ? 1 : 0 } as BridgeHttpResponse

    // Convert response to QuickJSHandle
    const quickjsObject = vm.newObject()
    vm.newString(response.body).consume((it) => vm.setProp(quickjsObject, 'body', it))
    vm.newNumber(response.code).consume((it) => vm.setProp(quickjsObject, 'code', it))
    vm.newNumber(response.isOk).consume((it) => vm.setProp(quickjsObject, 'isOk', it))
    return quickjsObject
  })
}

export default createHttpPackage
