import { VM, createArray, defineAsyncMethod, defineGlobalObject, defineMethod } from './quickjs'

interface BridgeHttpResponse {
  body: string
  code: number
  isOk: number // No boolean in QuickJS
}

interface FetchArgs {
  method?: string
  url: string
  headers?: { [key: string]: string }
  body?: string
  useAuth?: boolean
}

const createHttpPackage = (vm: VM) => {
  // url: string, headers: { [key: string]: string }
  const fetchFunc = async ({
    method = 'GET',
    url,
    headers = {},
    body,
    useAuth = false,
  }: FetchArgs) => {
    const res = await fetch(url, { method, headers, body })
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

    defineMethod(vm, batcherHandle, 'GET', (url, headers) => {
      requests.push({ url, headers })
      return batcherHandle.dup()
    })

    defineMethod(vm, batcherHandle, 'POST', (url, body, headers) => {
      requests.push({ url, headers, body })
      return batcherHandle.dup()
    })

    defineAsyncMethod(vm, batcherHandle, 'execute', async () => {
      const responses = await Promise.all(requests.map(fetchFunc))
      return createArray(vm, responses)
    })

    // Must duplicate or else batcherHandle will get garbage collected
    return batcherHandle.dup()
  })

  // TODO cannot handle error in suspended function QuickJSUseAfterFree: Lifetime not alive
  defineAsyncMethod(vm, httpHandle, 'GET', (url, headers) => fetchFunc({ url, headers }))
  defineAsyncMethod(vm, httpHandle, 'POST', (url, body, headers, useAuth) =>
    fetchFunc({ url, headers, body, method: 'POST', useAuth })
  )
}

export default createHttpPackage
