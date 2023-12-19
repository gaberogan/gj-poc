import { QuickJSAsyncContext } from 'quickjs-emscripten'
import { defineAsyncMethod, defineGlobalObject } from './quickjs'

const createHttpPackage = (vm: QuickJSAsyncContext) => {
  const httpHandle = defineGlobalObject(vm, 'http')

  defineAsyncMethod(vm, httpHandle, 'GET', async (url, headers) => {
    const res = await fetch(url, { headers })
    const text = await res.text()

    const responseObject = vm.newObject()
    vm.newString(text).consume((it) => vm.setProp(responseObject, 'body', it))
    vm.newNumber(res.status).consume((it) => vm.setProp(responseObject, 'code', it))
    // QuickJS doesn't seem to have a boolean value so use a number instead
    vm.newNumber(res.ok ? 1 : 0).consume((it) => vm.setProp(responseObject, 'isOk', it))

    return responseObject
  })
}

export default createHttpPackage
