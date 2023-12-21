import { VM, createArray, defineAsyncMethod, defineGlobalObject, defineMethod } from './quickjs'

interface BridgeHttpResponse {
  body: string
  code: number
  isOk: number // No boolean in QuickJS
}

const createHttpPackage = (vm: VM) => {
  const getMethod = async (url: string, headers: { [key: string]: string }) => {
    const res = await fetch(url, { headers })
    const text = await res.text()
    const response = { body: text, code: res.status, isOk: res.ok ? 1 : 0 } as BridgeHttpResponse

    // Convert response to QuickJSHandle
    const quickjsObject = vm.newObject()
    vm.newString(response.body).consume((it) => vm.setProp(quickjsObject, 'body', it))
    vm.newNumber(response.code).consume((it) => vm.setProp(quickjsObject, 'code', it))
    vm.newNumber(response.isOk).consume((it) => vm.setProp(quickjsObject, 'isOk', it))
    return quickjsObject
  }

  const httpHandle = defineGlobalObject(vm, 'http')

  defineMethod(vm, httpHandle, 'batch', () => {
    const requests: any[] = []

    const batcherHandle = vm.newObject()
    vm.setProp(vm.global, 'preserveReference1', batcherHandle)

    defineMethod(vm, batcherHandle, 'GET', (url, headers) => {
      requests.push({ url, headers })
      return batcherHandle.dup()
    })

    defineAsyncMethod(vm, batcherHandle, 'execute', async () => {
      const responses = await Promise.all(requests.map(async (r) => getMethod(r.url, r.headers)))
      return createArray(vm, responses)
    })

    // Must duplicate or else batcherHandle will get garbage collected
    return batcherHandle.dup()
  })

  // Hidden HTTP API
  defineAsyncMethod(vm, httpHandle, 'GET', getMethod)
}

export default createHttpPackage
