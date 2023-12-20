import { VM, defineAsyncMethod, defineGlobalObject, defineMethod } from './quickjs'
import cache from './cache'

interface BridgeHttpResponse {
  body: string
  code: number
  isOk: number // No boolean in QuickJS
}

const createHttpPackage = (vm: VM) => {
  const httpHandle = defineGlobalObject(vm, 'http')

  defineAsyncMethod(vm, httpHandle, 'GET', async (url, headers) => {
    let response: BridgeHttpResponse

    const cachedResponse = await cache.get(url)

    if (cachedResponse) {
      response = cachedResponse
    } else {
      const res = await fetch(url, { headers })
      const text = await res.text()
      response = { body: text, code: res.status, isOk: res.ok ? 1 : 0 }
      res.ok && cache.set(url, response, 60 /* seconds ttl */) // No need to await
    }

    // Convert response to QuickJSHandle
    const quickjsObject = vm.newObject()
    vm.newString(response.body).consume((it) => vm.setProp(quickjsObject, 'body', it))
    vm.newNumber(response.code).consume((it) => vm.setProp(quickjsObject, 'code', it))
    vm.newNumber(response.isOk).consume((it) => vm.setProp(quickjsObject, 'isOk', it))
    return quickjsObject
  })

  defineMethod(vm, httpHandle, 'batch', () => {
    throw new Error('TODO')
  })
}

export default createHttpPackage
